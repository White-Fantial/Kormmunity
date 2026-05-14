import { redirect } from 'next/navigation';

import { updateReputationSettingsAction } from '@/app/admin/actions';
import { adminManagementNavItems, ManagementSectionNav } from '@/components/admin/management-section-nav';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getCurrentUser } from '@/lib/auth/session';
import { canMakeFinalUserDecision } from '@/lib/permissions';
import {
  REPUTATION_SETTING_DEFAULTS,
  REPUTATION_SETTING_FIELDS,
  getReputationSettings,
} from '@/lib/reputation-settings';

export const dynamic = 'force-dynamic';

type AdminReputationSettingsPageProps = {
  searchParams: Promise<{ error?: string; success?: string }>;
};

const sectionTitle: Record<(typeof REPUTATION_SETTING_FIELDS)[number]['section'], string> = {
  community: 'communityScore 설정',
  'warmth-delta': '온기 delta 설정',
  'warmth-curve': '온기 곡선 설정',
};

export default async function AdminReputationSettingsPage({
  searchParams,
}: AdminReputationSettingsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canMakeFinalUserDecision(currentUser)) {
    redirect('/posts');
  }

  const [params, settings] = await Promise.all([searchParams, getReputationSettings()]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">관리자 — 점수/온기 설정</h1>
        <ManagementSectionNav items={adminManagementNavItems} />
      </div>

      {params.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      {params.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{params.success}</p>
      ) : null}

      <form action={updateReputationSettingsAction} className="space-y-4 rounded-xl border border-[#e8e8e8] bg-white p-4 shadow-sm">
        {(['community', 'warmth-delta', 'warmth-curve'] as const).map((section) => (
          <div key={section} className="space-y-3 border-b border-[#f0f0f0] pb-4 last:border-b-0 last:pb-0">
            <h2 className="font-semibold">{sectionTitle[section]}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {REPUTATION_SETTING_FIELDS.filter((field) => field.section === section).map((field) => (
                <label key={field.key} className="space-y-1 text-sm">
                  <span className="block text-[#555]">{field.label}</span>
                  <input
                    name={field.key}
                    type="number"
                    step={field.step ?? '0.1'}
                    defaultValue={settings[field.key] ?? REPUTATION_SETTING_DEFAULTS[field.key]}
                    className="w-full rounded-lg border border-[#e8e8e8] px-2 py-1.5 focus:border-[#fee500] focus:outline-none"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        <FormSubmitButton
          idleLabel="설정 저장"
          pendingLabel="저장 중..."
          className="rounded-xl bg-[#fee500] px-3 py-2 text-sm font-bold text-[#3c1e1e] hover:bg-[#f5db00]"
        />
      </form>
    </section>
  );
}
