import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { useNotifications, AppNotification } from '../../context/NotificationsContext';

const TYPE_LABELS: Record<string, string> = {
  quote_accepted: 'Proposal Accepted',
  application_submitted: 'Application Submitted',
  document_uploaded: 'Documents Uploaded',
  large_proposal_reviewed: 'Large Proposal Reviewed',
};

const TYPE_COLORS: Record<string, string> = {
  quote_accepted: 'bg-green-100 text-green-700',
  application_submitted: 'bg-blue-100 text-blue-700',
  document_uploaded: 'bg-amber-100 text-amber-700',
  large_proposal_reviewed: 'bg-teal-100 text-teal-700',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function NotificationRow({ n, onRead }: { n: AppNotification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const unread = !n.read_at;

  function handleClick() {
    if (unread) onRead(n.id);
    if (n.quote_id) navigate(`/quotes/${n.quote_id}`);
  }

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 px-4 py-4 transition-colors cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${unread ? 'bg-green-50/40' : ''}`}
    >
      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${unread ? 'bg-[#28AA48]' : 'bg-transparent'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
            {TYPE_LABELS[n.type] ?? n.type}
          </span>
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo(n.created_at)}</span>
        </div>
        <p className={`text-sm ${unread ? 'font-semibold text-[#1e2d3d]' : 'font-medium text-gray-700'}`}>{n.title}</p>
        {n.body && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>}
        {n.quote_id && (
          <span className="inline-flex items-center gap-1 text-xs text-[#28AA48] mt-1 font-medium">
            <ExternalLink className="w-3 h-3" />
            View proposal
          </span>
        )}
      </div>
    </div>
  );
}

export function NotificationsPanel() {
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#28AA48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-[#1e2d3d]">Notifications</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#28AA48] bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-600">No notifications yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              You'll be notified here when clients accept proposals, submit applications, or upload documents.
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <NotificationRow key={n.id} n={n} onRead={markRead} />
          ))
        )}
      </div>
    </div>
  );
}
