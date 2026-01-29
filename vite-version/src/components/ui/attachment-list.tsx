import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileImage, FileText, File, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Attachment {
  id: number;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  isInternal: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDownload: (attachmentId: number) => void;
  onDelete?: (attachmentId: number) => void;
  showDelete?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  onDownload,
  onDelete,
  showDelete = false,
  className
}: AttachmentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-4 w-4" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment) => (
        <Card
          key={attachment.id}
          className={cn(
            'p-3',
            attachment.isInternal && 'border-yellow-200 bg-yellow-50'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
              {getFileIcon(attachment.mimeType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {attachment.originalFileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)} • {formatDate(attachment.uploadedAt)}
                {attachment.isInternal && ' • Interno'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDownload(attachment.id)}
                title="Scarica"
              >
                <Download className="h-4 w-4" />
              </Button>
              {showDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(attachment.id)}
                  title="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
