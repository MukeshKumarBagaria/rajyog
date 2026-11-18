'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/feedback';
import { bulkImportLecturesAction } from '@/actions/admin';
import { parseBulkLectures } from '@/lib/youtube/video-id';
import { toast } from '@/stores/toast-store';

const EXAMPLE = `# Title | YouTube or Google Drive link | duration (optional)
Introduction to Ancient Rajasthan | https://youtu.be/xxxxxxxxxxx | 42:10
Kalibangan and Ahar Culture | https://drive.google.com/file/d/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/view | 1:05:00`;

export function BulkImport({ chapterId, chapterTitle }: { chapterId: string; chapterTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const preview = parseBulkLectures(text);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ListPlus className="h-4 w-4" /> Bulk import
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Bulk import lectures" description={`Into “${chapterTitle}”. One lecture per line, appended in order.`}>
        <div className="space-y-3">
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="font-mono text-xs" aria-label="Lectures to import" />
          {text.trim() ? (
            <Alert tone={preview.errors.length ? 'warning' : 'success'}>
              {preview.items.length} valid lecture{preview.items.length === 1 ? '' : 's'}
              {preview.errors.length ? ` · ${preview.errors.length} line(s) will be skipped: ${preview.errors.slice(0, 3).map((e) => `line ${e.line} (${e.message})`).join('; ')}` : ''}
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              disabled={!preview.items.length}
              onClick={() =>
                start(async () => {
                  const res = await bulkImportLecturesAction(chapterId, text);
                  if (!res.ok) return void toast.error('Import failed', res.error);
                  toast.success(`Imported ${res.data.imported} lectures`, res.data.errors.length ? `${res.data.errors.length} line(s) skipped` : undefined);
                  setText('');
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Import {preview.items.length || ''}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
