# IAM Policies for Secrets Management

This directory contains IAM policy documents for managing access to AWS Secrets Manager secrets.

## Policy Documents

### 1. secrets-read-only-policy.json

**Purpose:** Application runtime access (EC2, ECS, Lambda)

**Permissions:**
- ✅ Read secrets (GetSecretValue, DescribeSecret)
- ❌ Create, update, or delete secrets
- ❌ Rotate secrets

**Use Case:** Attach to IAM roles for application servers that need to read secrets but not modify them.

**Example Usage:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-read-only \
  --policy-document file://iam-policies/secrets-read-only-policy.json

# Attach to an IAM role
aws iam attach-role-policy \
  --role-name whatsapp-saas-app-role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-read-only
```

### 2. secrets-cicd-policy.json

**Purpose:** CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)

**Permissions:**
- ✅ Full access to MVP environment secrets
- ✅ Create, update, delete, rotate secrets
- ✅ List all secrets
- ❌ Delete production secrets (safety measure)

**Use Case:** Attach to IAM users/roles for CI/CD systems that need to create and update secrets during deployment.

**Example Usage:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-cicd \
  --policy-document file://iam-policies/secrets-cicd-policy.json

# Attach to a CI/CD user
aws iam attach-user-policy \
  --user-name github-actions-user \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-cicd
```

### 3. secrets-rotation-policy.json

**Purpose:** Secret rotation scripts and Lambda functions

**Permissions:**
- ✅ Read and update specific secrets (admin-token, meta-*)
- ✅ Invoke rotation Lambda functions
- ❌ Rotate database and Redis secrets (should use RDS/ElastiCache rotation)

**Use Case:** Attach to Lambda functions or IAM users responsible for rotating secrets.

**Example Usage:**
```bash
# Create the policy
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-rotation \
  --policy-document file://iam-policies/secrets-rotation-policy.json

# Attach to a Lambda execution role
aws iam attach-role-policy \
  --role-name whatsapp-saas-rotation-lambda-role \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-rotation
```

## Least Privilege Principle

These policies follow the principle of least privilege:

1. **Application Runtime** - Read-only access to secrets
2. **CI/CD Pipelines** - Full access to MVP secrets, but cannot delete production secrets
3. **Rotation Functions** - Limited to rotation operations on specific secrets

## Resource ARN Patterns

All policies use specific ARN patterns to limit scope:

```
arn:aws:secretsmanager:*:*:secret:whatsapp-saas/mvp/*
```

This ensures:
- Access is limited to `whatsapp-saas` project secrets
- Access is limited to `mvp` environment
- Other projects and environments are not accessible

## Conditions

Policies use conditions to enforce additional constraints:

```json
"Condition": {
  "StringEquals": {
    "secretsmanager:ResourceTag/Project": "whatsapp-saas",
    "secretsmanager:ResourceTag/Environment": "mvp"
  }
}
```

This ensures secrets must be tagged correctly to be accessible.

## Deny Statements

Explicit deny statements are used for critical protections:

1. **Read-only policy** - Denies all write operations
2. **CI/CD policy** - Denies deletion of production secrets
3. **Rotation policy** - Denies rotation of database secrets

## Testing Policies

Test policies using the IAM policy simulator:

```bash
# Test read-only policy
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/app-role \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:whatsapp-saas/mvp/admin-token"

# Test CI/CD policy
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:user/cicd-user \
  --action-names secretsmanager:PutSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:whatsapp-saas/mvp/admin-token"
```

## Policy Management

### Creating Policies

```bash
# Read-only
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-read-only \
  --policy-document file://iam-policies/secrets-read-only-policy.json \
  --description "Read-only access to WhatsApp SaaS MVP secrets"

# CI/CD
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-cicd \
  --policy-document file://iam-policies/secrets-cicd-policy.json \
  --description "Full access to WhatsApp SaaS MVP secrets for CI/CD"

# Rotation
aws iam create-policy \
  --policy-name whatsapp-saas-mvp-secrets-rotation \
  --policy-document file://iam-policies/secrets-rotation-policy.json \
  --description "Secret rotation access for WhatsApp SaaS MVP"
```

### Updating Policies

```bash
# Create new policy version
aws iam create-policy-version \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-read-only \
  --policy-document file://iam-policies/secrets-read-only-policy.json \
  --set-as-default
```

### Deleting Policies

```bash
# Detach from all entities first
aws iam list-entities-for-policy \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-read-only

# Delete non-default versions
aws iam delete-policy-version \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-read-only \
  --version-id v1

# Delete policy
aws iam delete-policy \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/whatsapp-saas-mvp-secrets-read-only
```

## Security Best Practices

1. **Use Resource Tags** - Tag all secrets with Project and Environment
2. **Separate Policies** - Don't mix read and write permissions
3. **Environment Isolation** - Use different policies for dev/staging/production
4. **Regular Audits** - Review IAM access logs quarterly
5. **Rotate Credentials** - Rotate IAM access keys every 90 days
6. **MFA for Write** - Require MFA for secret write operations in production

## Troubleshooting

### Access Denied Errors

If you get access denied errors:

1. Check the resource ARN matches the policy pattern
2. Verify the secret has correct tags (Project, Environment)
3. Check if there's an explicit deny statement
4. Review CloudTrail logs for detailed error information

```bash
# Check CloudTrail for access errors
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-results 10
```

### Policy Not Working

1. Wait 5-10 minutes for IAM policy propagation
2. Verify policy is attached to correct role/user
3. Check policy version is set as default
4. Test using IAM policy simulator

## References

- [AWS Secrets Manager Policies](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Least Privilege](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html#grant-least-privilege)

---

**Last Updated:** 2025-10-17
