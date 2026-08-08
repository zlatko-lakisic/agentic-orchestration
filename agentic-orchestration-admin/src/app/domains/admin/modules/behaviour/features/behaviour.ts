import { Component } from '@angular/core';
import { ConfigSettingsPage } from '@/app/domains/admin/shared/config-settings/config-settings-page';
import { SettingsSection } from '@/app/domains/admin/shared/config-settings/config-settings-table';

@Component({
  selector: 'ao-behaviour-page',
  imports: [ConfigSettingsPage],
  template: `
    <div
      class="mx-auto flex w-full max-w-7xl flex-auto flex-col gap-6 p-6 lg:px-8 lg:pt-8 lg:pb-10"
    >
      <div>
        <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
          Behaviour
        </div>
        <div class="text-neutral-500">
          How a run is shaped — planner, iteration, memory, QA, and anonymization
        </div>
        <p class="mt-2 text-sm text-amber-800 dark:text-amber-300">
          Impartial QA, faithfulness (final) QA, and learning eval are separate
          mechanisms; their scores are not comparable.
        </p>
      </div>
      <ao-config-settings-page
        [groups]="['planner', 'memory']"
        [sections]="sections"
        sectionTitle=""
      />
    </div>
  `,
})
export class BehaviourPage {
  readonly sections: SettingsSection[] = [
    { id: 'run_shape', title: 'Run shape' },
    { id: 'iteration', title: 'Iteration' },
    { id: 'planner_model', title: 'Planner model' },
    { id: 'sessions_cache', title: 'Sessions & cache' },
    { id: 'kb', title: 'Knowledge base' },
    { id: 'learning', title: 'Learning' },
    {
      id: 'quality_gates',
      title: 'Quality gates',
      description:
        'Three separate scoring paths — do not treat scores as interchangeable.',
    },
    { id: 'anonymization', title: 'Anonymization' },
    {
      id: 'web_defaults',
      title: 'Web client defaults',
      description: 'Seed the next chat session; do not affect in-flight runs.',
    },
  ];
}
