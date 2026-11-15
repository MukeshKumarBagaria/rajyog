import type { Metadata } from 'next';
import { Pencil, Plus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { FormDialog } from '@/components/admin/form-dialog';
import { QuoteFields } from '@/components/admin/fields';
import { ActiveToggle, DeleteContentButton } from '@/components/admin/row-actions';
import { saveQuoteAction } from '@/actions/admin';
import { formatDateKey } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Motivation' };

export default async function AdminQuotesPage() {
  const supabase = await getSupabase();
  const { data: quotes } = await supabase.from('motivational_quotes').select('*').order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-secondary">One message is shown per day. A message with a date always wins on that date.</p>
        <FormDialog title="New message" action={saveQuoteAction} triggerLabel={<><Plus className="h-4 w-4" /> Message</>} successMessage="Message saved">
          <QuoteFields />
        </FormDialog>
      </div>
      <Card className="divide-y divide-line">
        {(quotes ?? []).map((q) => (
          <div key={q.id} className="flex items-start gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink" lang={q.language === 'en' ? 'en' : 'hi'}>
                {q.quote}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge>{q.language}</Badge>
                <Badge tone="primary">{q.category}</Badge>
                {q.attribution ? <Badge>— {q.attribution}</Badge> : null}
                {q.display_date ? <Badge tone="warning">{formatDateKey(q.display_date)}</Badge> : null}
              </div>
            </div>
            <ActiveToggle table="motivational_quotes" id={q.id} active={q.is_active} />
            <FormDialog
              title="Edit message"
              action={saveQuoteAction}
              triggerLabel={<Pencil className="h-4 w-4" />}
              triggerProps={{ variant: 'ghost', size: 'icon-sm', 'aria-label': 'Edit message' }}
              successMessage="Message updated"
            >
              <QuoteFields quote={q} />
            </FormDialog>
            <DeleteContentButton table="motivational_quotes" id={q.id} label="this message" />
          </div>
        ))}
      </Card>
    </div>
  );
}
