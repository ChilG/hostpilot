import { invoke } from "@tauri-apps/api/core";
import { isTauri, getProfileHosts } from "../types";
import { useAppStore } from "../AppStore";

/**
 * Filters the host entries belonging to the active profile, writes them to
 * the system hosts file (if running under Tauri), and dispatches a
 * custom "hosts-file-updated" event so that other components can reload.
 */
export async function applyActiveProfile(): Promise<void> {
  const { hosts, profiles } = useAppStore.getState();
  const activeProfile = profiles.find((p) => p.active);
  if (!activeProfile) return;

  const profileEntries = getProfileHosts(activeProfile, hosts);

  if (isTauri) {
    await invoke("write_hosts_block", {
      blockName: activeProfile.name,
      entries: profileEntries,
    });
  }

  window.dispatchEvent(new CustomEvent("hosts-file-updated"));
}
