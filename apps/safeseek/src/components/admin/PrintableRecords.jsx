// The printed weekly record: one US Letter page per kid.
//
// Rendered into document.body through a portal and hidden on screen. When the
// parent prints, everything else on the page is hidden and these pages are
// the only thing the printer sees. The page geometry is fixed at 8.5 x 11 in
// with half-inch margins and the content is sized in inches and points, so
// the browser prints it 1:1 instead of scaling it. Real text, not an image,
// so it stays crisp.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import { subjectLabel, formatDayRange, dayKeyToDate, plural } from './shared';

const PRINT_CSS = `
.sf-print-root { display: none; }
@media print {
  @page { size: 8.5in 11in; margin: 0.5in; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(.sf-print-root) { display: none !important; }
  .sf-print-root { display: block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sf-print-page {
    width: 7.5in;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    font-family: Quicksand, "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.4;
    color: #111;
  }
  .sf-print-page:last-child { page-break-after: auto; break-after: auto; }
  .sf-print-page * { box-sizing: border-box; }
  .sf-print-brand { font-size: 9pt; letter-spacing: 0.06em; text-transform: uppercase; color: #666; margin: 0 0 4pt; }
  .sf-print-kid { font-family: Fredoka, Quicksand, "Helvetica Neue", Arial, sans-serif; font-size: 22pt; font-weight: 700; margin: 0; color: #221D2E; }
  .sf-print-range { font-size: 11pt; color: #444; margin: 2pt 0 0; }
  .sf-print-rule { border: 0; border-top: 1.5pt solid #221D2E; margin: 10pt 0 12pt; }
  .sf-print-totals { display: flex; gap: 0; border: 0.75pt solid #bbb; border-radius: 4pt; margin: 0 0 14pt; }
  .sf-print-total { flex: 1; padding: 6pt 8pt; border-right: 0.75pt solid #bbb; }
  .sf-print-total:last-child { border-right: 0; }
  .sf-print-total-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 0; }
  .sf-print-total-value { font-size: 15pt; font-weight: 700; margin: 0; }
  .sf-print-total-sub { font-size: 8pt; color: #666; margin: 0; }
  .sf-print-h2 { font-size: 11.5pt; font-weight: 700; margin: 0 0 6pt; color: #221D2E; }
  .sf-print-table { width: 100%; border-collapse: collapse; margin: 0 0 14pt; }
  .sf-print-table th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #666; border-bottom: 0.75pt solid #999; padding: 3pt 4pt; }
  .sf-print-table td { vertical-align: top; padding: 4pt 4pt; border-bottom: 0.5pt solid #ddd; font-size: 9.5pt; }
  .sf-print-table tr { page-break-inside: avoid; break-inside: avoid; }
  .sf-print-table .num { text-align: right; white-space: nowrap; }
  .sf-print-quiet td { color: #999; font-style: italic; }
  .sf-print-topic { margin: 0; }
  .sf-print-topic .sub { color: #666; }
  .sf-print-topic .status { color: #444; }
  .sf-print-sign { display: flex; gap: 24pt; margin-top: 24pt; }
  .sf-print-sign div { flex: 1; }
  .sf-print-sign .line { border-bottom: 0.75pt solid #333; height: 22pt; }
  .sf-print-sign .label { font-size: 8pt; color: #666; margin: 3pt 0 0; }
  .sf-print-foot { font-size: 8pt; color: #888; margin-top: 16pt; }
}
`;

function fmtLong(dayKey) {
  const d = dayKeyToDate(dayKey);
  return d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : dayKey;
}

function topicLine(t) {
  let status = '';
  if (t.status === 'complete') status = t.score != null && t.total ? `done, ${t.score}/${t.total}` : 'done';
  else if (t.status === 'started') status = 'started';
  else status = 'not started';
  return (
    <p className="sf-print-topic">
      {t.topic} <span className="sub">({subjectLabel(t.subject)})</span> <span className="status">&mdash; {status}</span>
    </p>
  );
}

function KidPage({ kid, days, onLoaded }) {
  const { token } = useAuth();
  const week = useQuery(api.progress.getWeek, { kidProfileId: kid._id, days, userToken: token ?? undefined });

  useEffect(() => {
    onLoaded(kid._id, week !== undefined);
  }, [kid._id, week, onLoaded]);

  if (!week) return null;

  const printedOn = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <section className="sf-print-page" aria-hidden="true">
      <p className="sf-print-brand">SafeStudy weekly record</p>
      <h1 className="sf-print-kid">{week.kidName}</h1>
      <p className="sf-print-range">{formatDayRange(week.from, week.to)}</p>
      <hr className="sf-print-rule" />

      <div className="sf-print-totals">
        <div className="sf-print-total">
          <p className="sf-print-total-label">Lessons finished</p>
          <p className="sf-print-total-value">{week.totals.lessonsCompleted}</p>
          <p className="sf-print-total-sub">of {week.totals.lessonsAssigned} assigned</p>
        </div>
        <div className="sf-print-total">
          <p className="sf-print-total-label">Review cards</p>
          <p className="sf-print-total-value">{week.totals.cardsReviewed}</p>
          <p className="sf-print-total-sub">{week.reviewAccuracy != null ? `${week.reviewAccuracy}% remembered` : 'none reviewed'}</p>
        </div>
        <div className="sf-print-total">
          <p className="sf-print-total-label">Tutor messages</p>
          <p className="sf-print-total-value">{week.totals.tutorMessages}</p>
          <p className="sf-print-total-sub">&nbsp;</p>
        </div>
        <div className="sf-print-total">
          <p className="sf-print-total-label">Searches</p>
          <p className="sf-print-total-value">{week.totals.searches}</p>
          <p className="sf-print-total-sub">&nbsp;</p>
        </div>
        <div className="sf-print-total">
          <p className="sf-print-total-label">Streak</p>
          <p className="sf-print-total-value">{week.currentStreak}</p>
          <p className="sf-print-total-sub">{plural(week.currentStreak, 'day')} in a row</p>
        </div>
      </div>

      <h2 className="sf-print-h2">Subjects covered</h2>
      {week.subjects.length === 0 ? (
        <p style={{ margin: '0 0 14pt', color: '#666' }}>No lessons finished in this period.</p>
      ) : (
        <table className="sf-print-table">
          <thead>
            <tr>
              <th style={{ width: '1.3in' }}>Subject</th>
              <th style={{ width: '0.8in' }} className="num">Lessons</th>
              <th>Topics</th>
            </tr>
          </thead>
          <tbody>
            {week.subjects.map((s) => (
              <tr key={s.subject}>
                <td>{subjectLabel(s.subject)}</td>
                <td className="num">{s.lessons}</td>
                <td>{s.topics.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="sf-print-h2">Day by day</h2>
      <table className="sf-print-table">
        <thead>
          <tr>
            <th style={{ width: '1.1in' }}>Date</th>
            <th>Lessons</th>
            <th style={{ width: '0.9in' }} className="num">Review</th>
            <th style={{ width: '0.7in' }} className="num">Tutor</th>
            <th style={{ width: '0.8in' }} className="num">Searches</th>
          </tr>
        </thead>
        <tbody>
          {week.daily.map((d) => {
            const quiet =
              d.topics.length === 0 && d.cardsReviewed === 0 && d.tutorMessages === 0 && d.searches === 0 && d.quizzesTaken === 0;
            return (
              <tr key={d.day} className={quiet ? 'sf-print-quiet' : undefined}>
                <td>{fmtLong(d.day)}</td>
                <td>
                  {d.topics.length === 0
                    ? quiet ? 'Nothing recorded' : '—'
                    : d.topics.map((t, i) => <span key={i}>{topicLine(t)}</span>)}
                </td>
                <td className="num">{d.cardsReviewed > 0 ? `${d.cardsReviewed} (${d.cardsCorrect} right)` : '—'}</td>
                <td className="num">{d.tutorMessages > 0 ? d.tutorMessages : '—'}</td>
                <td className="num">{d.searches > 0 ? d.searches : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="sf-print-sign">
        <div>
          <div className="line" />
          <p className="label">Parent or teacher signature</p>
        </div>
        <div style={{ flex: '0 0 1.8in' }}>
          <div className="line" />
          <p className="label">Date</p>
        </div>
      </div>

      <p className="sf-print-foot">Printed {printedOn} from SafeStudy (getsafestudy.com). Days follow the family&rsquo;s time zone.</p>
    </section>
  );
}

export default function PrintableRecords({ kidProfiles, days, onLoaded }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="sf-print-root">
      <style>{PRINT_CSS}</style>
      {(kidProfiles || []).map((kid) => (
        <KidPage key={kid._id} kid={kid} days={days} onLoaded={onLoaded} />
      ))}
    </div>,
    document.body,
  );
}
