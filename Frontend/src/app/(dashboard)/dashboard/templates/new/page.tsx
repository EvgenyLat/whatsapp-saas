/**
 * New Template Page
 * Create a new WhatsApp message template
 *
 * Features:
 * - Form with all template fields
 * - Live preview panel
 * - Variable syntax helper ({{1}}, {{2}})
 * - Character counter for each section
 * - Form validation
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, Button, Input } from '@/components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSalonIdSafe } from '@/hooks/useSalonId';
import { api } from '@/lib/api';
import type { CreateTemplateRequest } from '@/types';
import { ArrowLeft, Plus, Trash2, Eye, HelpCircle } from 'lucide-react';

interface ButtonInput {
  type: 'url' | 'phone' | 'quick_reply';
  text: string;
  value?: string;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const salonId = useSalonIdSafe();

  // Form state
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<'marketing' | 'utility' | 'authentication'>('utility');
  const [language, setLanguage] = React.useState('en');
  const [headerType, setHeaderType] = React.useState<'none' | 'text' | 'image'>('none');
  const [headerContent, setHeaderContent] = React.useState('');
  const [body, setBody] = React.useState('');
  const [footer, setFooter] = React.useState('');
  const [buttons, setButtons] = React.useState<ButtonInput[]>([]);

  const createMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) => api.templates.create(salonId || '', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push(`/dashboard/templates/${data.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateTemplateRequest = {
      name,
      category,
      language,
      content: body,
      header: headerType !== 'none' ? headerContent : undefined,
      footer: footer || undefined,
      buttons: buttons.length > 0 ? buttons.map(b => ({ type: b.type, text: b.text })) : undefined,
    };

    createMutation.mutate(data);
  };

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { type: 'quick_reply', text: '' }]);
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, field: keyof ButtonInput, value: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value } as ButtonInput;
    setButtons(updated);
  };

  // Highlight variables in preview
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      if (/\{\{\d+\}\}/.test(part)) {
        return (
          <span key={index} className="bg-primary-100 text-primary-700 px-1 rounded font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Create New Template</h1>
          <p className="mt-1 text-neutral-600">
            Design a new WhatsApp message template for customer communication
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-neutral-900">Basic Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                    Template Name *
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="booking_confirmation"
                    required
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    Lowercase letters, numbers, and underscores only. No spaces.
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-neutral-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="marketing">Marketing</option>
                    <option value="utility">Utility</option>
                    <option value="authentication">Authentication</option>
                  </select>
                  <p className="mt-1 text-xs text-neutral-500">
                    {category === 'marketing' && 'Promotional content and offers'}
                    {category === 'utility' && 'Transactional and service updates'}
                    {category === 'authentication' && 'One-time passwords and verification'}
                  </p>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-neutral-700 mb-1">
                    Language *
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="pt">Portuguese</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Header (Optional) */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-neutral-900">Header (Optional)</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Header Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setHeaderType('none')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        headerType === 'none'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderType('text')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        headerType === 'text'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      Text
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderType('image')}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        headerType === 'image'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                    >
                      Image
                    </button>
                  </div>
                </div>

                {headerType === 'text' && (
                  <div>
                    <label htmlFor="headerContent" className="block text-sm font-medium text-neutral-700 mb-1">
                      Header Text
                    </label>
                    <Input
                      id="headerContent"
                      type="text"
                      value={headerContent}
                      onChange={(e) => setHeaderContent(e.target.value)}
                      placeholder="Your Appointment Confirmed"
                      maxLength={60}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      {headerContent.length}/60 characters
                    </p>
                  </div>
                )}

                {headerType === 'image' && (
                  <div>
                    <label htmlFor="headerContent" className="block text-sm font-medium text-neutral-700 mb-1">
                      Image URL
                    </label>
                    <Input
                      id="headerContent"
                      type="url"
                      value={headerContent}
                      onChange={(e) => setHeaderContent(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Body */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Message Body *</h2>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    onClick={() => alert('Use {{1}}, {{2}}, {{3}} for variables. Example: "Hi {{1}}, your appointment is at {{2}}"')}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Variables Help
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{1}}, your booking for {{2}} is confirmed on {{3}}. See you soon!"
                  rows={6}
                  maxLength={1024}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Use variables: &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, &#123;&#123;3&#125;&#125;</span>
                  <span>{body.length}/1024 characters</span>
                </div>
              </CardContent>
            </Card>

            {/* Footer (Optional) */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-neutral-900">Footer (Optional)</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  type="text"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Reply STOP to unsubscribe"
                  maxLength={60}
                />
                <p className="text-xs text-neutral-500">
                  {footer.length}/60 characters
                </p>
              </CardContent>
            </Card>

            {/* Buttons (Optional) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">Buttons (Optional)</h2>
                  <Button
                    type="button"
                    variant="secondary"
                    
                    onClick={addButton}
                    disabled={buttons.length >= 3}
                  >
                    <Plus className="h-4 w-4" />
                    Add Button
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {buttons.length === 0 && (
                  <p className="text-sm text-neutral-500">
                    Add up to 3 buttons for customer actions
                  </p>
                )}
                {buttons.map((button, index) => (
                  <div key={index} className="flex gap-2 p-3 rounded-lg border border-neutral-200">
                    <div className="flex-1 space-y-2">
                      <select
                        value={button.type}
                        onChange={(e) => updateButton(index, 'type', e.target.value)}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="quick_reply">Quick Reply</option>
                        <option value="url">URL</option>
                        <option value="phone">Phone</option>
                      </select>
                      <Input
                        type="text"
                        value={button.text}
                        onChange={(e) => updateButton(index, 'text', e.target.value)}
                        placeholder="Button Text"
                        maxLength={20}
                        
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeButton(index)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-error-600 hover:bg-error-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>

            {createMutation.isError && (
              <div className="rounded-md bg-error-50 border border-error-200 p-4">
                <p className="text-sm font-medium text-error-800">
                  Failed to create template
                </p>
                <p className="text-sm text-error-700 mt-1">
                  {createMutation.error?.message || 'Please try again'}
                </p>
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-neutral-500" />
                  <h2 className="text-lg font-semibold text-neutral-900">Live Preview</h2>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border-2 border-neutral-200 bg-white p-4">
                  {/* WhatsApp-style message bubble */}
                  <div className="rounded-lg bg-neutral-50 p-3 shadow-sm">
                    {headerType === 'text' && headerContent && (
                      <div className="mb-3 pb-3 border-b border-neutral-200">
                        <p className="font-semibold text-neutral-900">{headerContent}</p>
                      </div>
                    )}
                    {headerType === 'image' && headerContent && (
                      <div className="mb-3 pb-3 border-b border-neutral-200">
                        <div className="rounded-md bg-neutral-200 p-2 text-center text-xs text-neutral-600">
                          Image: {headerContent}
                        </div>
                      </div>
                    )}
                    {body ? (
                      <div className="text-neutral-900 whitespace-pre-wrap">
                        {highlightVariables(body)}
                      </div>
                    ) : (
                      <p className="text-neutral-400 italic">Your message will appear here...</p>
                    )}
                    {footer && (
                      <div className="mt-3 pt-3 border-t border-neutral-200">
                        <p className="text-xs text-neutral-500">{footer}</p>
                      </div>
                    )}
                    {buttons.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {buttons.map((button, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full rounded-md bg-white border border-primary-500 text-primary-600 py-2 text-sm font-medium"
                          >
                            {button.text || 'Button Text'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-neutral-400 text-right">WhatsApp</p>
                </div>

                {/* Variable Guide */}
                <div className="mt-4 rounded-md bg-primary-50 border border-primary-200 p-3">
                  <h3 className="text-sm font-semibold text-primary-900 mb-2">Variable Syntax</h3>
                  <div className="space-y-1 text-xs text-primary-800">
                    <p><code className="bg-primary-100 px-1 rounded">&#123;&#123;1&#125;&#125;</code> - First variable</p>
                    <p><code className="bg-primary-100 px-1 rounded">&#123;&#123;2&#125;&#125;</code> - Second variable</p>
                    <p><code className="bg-primary-100 px-1 rounded">&#123;&#123;3&#125;&#125;</code> - Third variable</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
