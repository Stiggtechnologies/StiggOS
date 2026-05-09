// Activity — full 30-day timeline of every event on the customer's sites.

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, UserCheck, Clock, Wrench, MapPin, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ago, ucfirst } from '../lib/format';

interface FeedItem {
  occurred_at: string; kind: string; site_id: string | null; site_name: string | null;
  severity: string | null; title: string | null; detail: string | null; ref_id: string | null;
}

const KINDS = ['all','incident','shift_started','shift_completed','service_request'] as const;

export function ActivityPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof KINDS[number]>('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('client_activity_feed', { limit_n: 200 });
      if (!error) setItems((data ?? []) as FeedItem[]);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.kind === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><Activity size={20} className="text-stigg-600" /> Activity</h1>
        <p className="page-subtitle">Last 30 days across your sites — patrols, incidents, requests.</p>
      </div>

      <div className="card-tight flex items-center gap-2 flex-wrap">
        <Filter size={12} className="text-ink-400" />
        {KINDS.map((k) => (
          <button
            key={k}
            className={`text-xs px-2.5 py-1 rounded-md ${filter === k ? 'bg-stigg-50 text-stigg-700 border border-stigg-200' : 'text-ink-500 hover:bg-ink-100'}`}
            onClick={() => setFilter(k)}
          >{k === 'all' ? `all (${items.length})` : ucfirst(k)}</button>
        ))}
      </div>

      {loading
        ? <div className="text-sm text-ink-500">Loading…</div>
        : filtered.length === 0
          ? <div className="card text-center py-10">
              <Activity size={28} className="mx-auto text-stigg-600 mb-2" />
              <h3 className="font-semibold text-ink-900">No activity in this window yet</h3>
              <p className="text-sm text-ink-600 mt-1 max-w-md mx-auto">As soon as our crews start patrols on your sites, every shift, scan, and incident will stream through here in real time.</p>
            </div>
          : <div className="card divide-y divide-ink-100 -my-1">
              {filtered.map((it, i) => <Row key={i} item={it} />)}
            </div>
      }
    </div>
  );
}

function Row({ item }: { item: FeedItem }) {
  const [Icon, iconColor, badge] =
    item.kind === 'incident'        ? [AlertTriangle, item.severity === 'critical' ? 'text-red-600' : item.severity === 'high' ? 'text-orange-600' : 'text-amber-600',
                                       <span className={item.severity === 'critical' ? 'chip-crit' : item.severity === 'high' ? 'chip-warn' : 'chip-info'}>{item.severity}</span>] :
    item.kind === 'shift_started'   ? [UserCheck,    'text-blue-600',    <span className="chip-info">shift start</span>] :
    item.kind === 'shift_completed' ? [UserCheck,    'text-emerald-600', <span className="chip-ok">shift complete</span>] :
    item.kind === 'service_request' ? [Wrench,       'text-stigg-600',   <span className="chip-mute">request</span>] :
                                       [Clock,       'text-ink-400',     null];
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon size={15} className={`${iconColor} mt-0.5 shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-ink-800">{item.title ?? ucfirst(item.kind)}</span>
          {badge}
        </div>
        {item.detail && <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{item.detail}</div>}
        <div className="text-[11px] text-ink-500 flex items-center gap-2 mt-1">
          <span className="inline-flex items-center gap-1"><MapPin size={10} />{item.site_name ?? '—'}</span>
          <span>·</span>
          <span title={new Date(item.occurred_at).toLocaleString()}>{ago(item.occurred_at)}</span>
        </div>
      </div>
    </div>
  );
}
