'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { useToast } from '@/shared/components/Toasts';
import { Modal } from '@/shared/components/Modal';
import { fromLocalInputValue, localZoneLabel, toLocalInputValue } from '@/features/editorial-shared/lib/schedule';
import { listCategories } from '@/features/categories/services/categoryService';
import type { PlanningItem } from '../planning';
import { createPlanning, listPlanningStaff, updatePlanning } from '../services/planningService';

export interface StaffOption {
  id: string;
  label: string;
}

export interface CategoryOption {
  id: string;
  label: string;
}

function errorCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'code' in body) {
    const code = (body as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/**
 * Create/edit form for planning items (Increment 8). Rendered inside the
 * shared Modal (focus trap, Escape, focus return). Status is never edited
 * here — transitions own status via the action endpoints.
 */
export function PlanningForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PlanningItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('planning');
  const { apiFetch } = useAuth();
  const { notify } = useToast();

  const [type, setType] = useState<'pitch' | 'assignment'>(initial?.type ?? 'pitch');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? '');
  const [reviewerId, setReviewerId] = useState(initial?.reviewerId ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 'normal');
  const [dueInput, setDueInput] = useState(
    initial?.dueAt ? toLocalInputValue(new Date(initial.dueAt)) : '',
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const cats = await listCategories(apiFetch, 'es');
        if (cats.ok) {
          const json = (await cats.json()) as { data: Array<{ id: string; slug: string; label: string }> };
          setCategories(json.data.map((c) => ({ id: c.id, label: `${c.label} (${c.slug})` })));
        }
      } catch {
        // Best-effort reference data.
      }
    })();
  }, [apiFetch]);

  useEffect(() => {
    // Staff roster comes from the planning service (audit-derived,
    // best-effort — see planningService.listPlanningStaff).
    void (async () => {
      setStaff(await listPlanningStaff(apiFetch));
    })();
  }, [apiFetch]);

  async function save() {
    if (title.trim().length < 3) {
      setFormError(t('titleRequired'));
      document.getElementById('pl-title')?.focus();
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId: categoryId || undefined,
        assigneeId: assigneeId || undefined,
        reviewerId: reviewerId || undefined,
        priority,
        dueAt: dueInput ? (fromLocalInputValue(dueInput) ?? undefined) : undefined,
      };
      const res = initial
        ? await updatePlanning(apiFetch, initial.id, body)
        : await createPlanning(apiFetch, body);
      if (!res.ok) {
        const code = errorCode(await res.json().catch(() => null));
        setFormError(code === 'invalid_transition' ? t('invalidTransition') : `HTTP ${res.status}`);
        return;
      }
      notify(initial ? t('saved') : t('created'), 'ok');
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={initial ? t('edit') : t('new')} onClose={onClose}>
      <div className="nh-field">
        <label htmlFor="pl-type">{t('fieldType')}</label>
        <select id="pl-type" value={type} disabled={busy} onChange={(event) => setType(event.target.value as 'pitch' | 'assignment')}>
          <option value="pitch">{t('typePitch')}</option>
          <option value="assignment">{t('typeAssignment')}</option>
        </select>
      </div>
      <div className="nh-field">
        <label htmlFor="pl-title">{t('fieldTitle')}</label>
        <input
          id="pl-title"
          type="text"
          value={title}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={formError ? true : undefined}
        />
      </div>
      <div className="nh-field">
        <label htmlFor="pl-description">{t('fieldDescription')}</label>
        <textarea id="pl-description" rows={3} value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div className="nh-field">
        <label htmlFor="pl-category">{t('fieldCategory')}</label>
        <select id="pl-category" value={categoryId} disabled={busy} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">{t('noCategory')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="nh-field">
        <label htmlFor="pl-assignee">{t('fieldAssignee')}</label>
        <select id="pl-assignee" value={assigneeId} disabled={busy} onChange={(event) => setAssigneeId(event.target.value)}>
          <option value="">{t('unassigned')}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="nh-field">
        <label htmlFor="pl-reviewer">{t('fieldReviewer')}</label>
        <select id="pl-reviewer" value={reviewerId} disabled={busy} onChange={(event) => setReviewerId(event.target.value)}>
          <option value="">{t('unassigned')}</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="nh-field">
        <label htmlFor="pl-priority">{t('fieldPriority')}</label>
        <select id="pl-priority" value={priority} disabled={busy} onChange={(event) => setPriority(event.target.value)}>
          <option value="low">{t('priorityLow')}</option>
          <option value="normal">{t('priorityNormal')}</option>
          <option value="high">{t('priorityHigh')}</option>
        </select>
      </div>
      <div className="nh-field">
        <label htmlFor="pl-due">{t('fieldDue')}</label>
        <input id="pl-due" type="datetime-local" value={dueInput} disabled={busy} onChange={(event) => setDueInput(event.target.value)} />
        <span className="nh-muted">{t('zoneNote', { zone: localZoneLabel() })}</span>
      </div>
      {formError && (
        <p className="nh-muted" role="alert">
          {formError}
        </p>
      )}
      <div className="nh-row">
        <button className="nh-btn" type="button" disabled={busy} onClick={onClose}>
          {t('cancelAction')}
        </button>
        <button className="nh-btn primary" type="button" disabled={busy} autoFocus onClick={() => void save()}>
          {t('save')}
        </button>
      </div>
    </Modal>
  );
}
