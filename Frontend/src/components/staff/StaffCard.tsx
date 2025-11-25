/**
 * StaffCard Component
 * Displays staff member in card format with actions
 */

'use client';

import * as React from 'react';
import { Card, CardContent, Badge, Button } from '@/components/ui';
import type { MasterListItem } from '@/types';
import { User, Phone, Mail, Calendar, Edit, Trash2, Eye } from 'lucide-react';

interface StaffCardProps {
  staff: MasterListItem;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function StaffCard({ staff, onView, onEdit, onDelete }: StaffCardProps) {
  const workingDays = staff.workingDays || [];

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onView(staff.id)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <User className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">{staff.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {staff.specialization.slice(0, 2).map((spec) => (
                  <Badge key={spec} variant="info" className="text-xs">
                    {spec.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {staff.specialization.length > 2 && (
                  <Badge variant="default" className="text-xs">
                    +{staff.specialization.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge variant={staff.is_active ? 'success' : 'default'}>
            {staff.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          {staff.phone && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Phone className="h-4 w-4" />
              <span>{staff.phone}</span>
            </div>
          )}
          {staff.email && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Mail className="h-4 w-4" />
              <span>{staff.email}</span>
            </div>
          )}
          {workingDays.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Calendar className="h-4 w-4" />
              <span>{workingDays.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-neutral-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView(staff.id);
            }}
            className="flex-1"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(staff.id);
            }}
            className="flex-1"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this staff member?')) {
                onDelete(staff.id);
              }
            }}
            className="text-error-600 hover:bg-error-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
