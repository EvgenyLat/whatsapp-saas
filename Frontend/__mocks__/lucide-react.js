/**
 * Mock for lucide-react icons
 * Used in test environment to prevent icon import errors
 */

const React = require('react');

// Generic mock icon component
const createMockIcon = (displayName) => {
  const MockIcon = (props) => {
    return React.createElement('svg', {
      'data-testid': `icon-${displayName.toLowerCase()}`,
      'aria-label': displayName,
      'role': 'img',
      ...props
    });
  };
  MockIcon.displayName = displayName;
  return MockIcon;
};

// Export all icons used in the application
module.exports = {
  ArrowLeft: createMockIcon('ArrowLeft'),
  ArrowRight: createMockIcon('ArrowRight'),
  Calendar: createMockIcon('Calendar'),
  Check: createMockIcon('Check'),
  CheckCircle: createMockIcon('CheckCircle'),
  ChevronDown: createMockIcon('ChevronDown'),
  ChevronLeft: createMockIcon('ChevronLeft'),
  ChevronRight: createMockIcon('ChevronRight'),
  ChevronUp: createMockIcon('ChevronUp'),
  Clock: createMockIcon('Clock'),
  Copy: createMockIcon('Copy'),
  Download: createMockIcon('Download'),
  Edit: createMockIcon('Edit'),
  Edit2: createMockIcon('Edit2'),
  Eye: createMockIcon('Eye'),
  EyeOff: createMockIcon('EyeOff'),
  FileText: createMockIcon('FileText'),
  Filter: createMockIcon('Filter'),
  HelpCircle: createMockIcon('HelpCircle'),
  Home: createMockIcon('Home'),
  Image: createMockIcon('Image'),
  Info: createMockIcon('Info'),
  Loader: createMockIcon('Loader'),
  Loader2: createMockIcon('Loader2'),
  Lock: createMockIcon('Lock'),
  LogOut: createMockIcon('LogOut'),
  Mail: createMockIcon('Mail'),
  Menu: createMockIcon('Menu'),
  MessageCircle: createMockIcon('MessageCircle'),
  MessageSquare: createMockIcon('MessageSquare'),
  MoreHorizontal: createMockIcon('MoreHorizontal'),
  MoreVertical: createMockIcon('MoreVertical'),
  Phone: createMockIcon('Phone'),
  Plus: createMockIcon('Plus'),
  PlusCircle: createMockIcon('PlusCircle'),
  RefreshCw: createMockIcon('RefreshCw'),
  Save: createMockIcon('Save'),
  Search: createMockIcon('Search'),
  Send: createMockIcon('Send'),
  Settings: createMockIcon('Settings'),
  Trash: createMockIcon('Trash'),
  Trash2: createMockIcon('Trash2'),
  TrendingDown: createMockIcon('TrendingDown'),
  TrendingUp: createMockIcon('TrendingUp'),
  Upload: createMockIcon('Upload'),
  User: createMockIcon('User'),
  Users: createMockIcon('Users'),
  X: createMockIcon('X'),
  XCircle: createMockIcon('XCircle'),
  AlertCircle: createMockIcon('AlertCircle'),
  AlertTriangle: createMockIcon('AlertTriangle'),
  BarChart: createMockIcon('BarChart'),
  Bell: createMockIcon('Bell'),
  ExternalLink: createMockIcon('ExternalLink'),
  Sparkles: createMockIcon('Sparkles'),
  default: createMockIcon('DefaultIcon'),
};
