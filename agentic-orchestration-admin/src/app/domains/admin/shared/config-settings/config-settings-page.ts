import { Component, OnInit, computed, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EffectiveConfigStore } from '@/app/core/ao-config/effective-config.store';
import {
  ConfigSettingsTable,
  SettingsSection,
} from '@/app/domains/admin/shared/config-settings/config-settings-table';

@Component({
  selector: 'ao-config-settings-page',
  imports: [ConfigSettingsTable],
  template: `
    <ao-config-settings-table
      [groups]="resolvedGroups()"
      [sections]="sections()"
      [title]="sectionTitle()"
      [description]="sectionDescription()"
      [conditionalKubernetes]="conditionalKubernetes()"
      [component]="component()"
    />
  `,
})
export class ConfigSettingsPage implements OnInit {
  protected config = inject(EffectiveConfigStore);
  private route = inject(ActivatedRoute);

  readonly groups = input<string[] | null>(null);
  readonly sections = input<SettingsSection[]>([]);
  readonly sectionTitle = input('Settings');
  readonly sectionDescription = input<string | null>(null);
  readonly conditionalKubernetes = input(false);
  readonly component = input<string | null>(null);

  readonly resolvedGroups = computed(() => {
    const fromInput = this.groups();
    if (fromInput?.length) return fromInput;
    const data = this.route.snapshot.data;
    return (data['groups'] as string[]) || [];
  });

  ngOnInit() {
    this.config.load();
  }
}
