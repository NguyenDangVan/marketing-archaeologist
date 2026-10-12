import { resolve, join } from "node:path";

// A workspace is the user's research directory (separate from this tool's repo):
//   niches/<niche>/{niche.yaml,brands.yaml,playbook.md}   — edited by people, versioned in git
//   data/marc.db, data/snapshots/YYYY/MM/DD/<evidence id>.<ext>
//   reports/, proposals/
export class Workspace {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  static resolve(flag?: string): Workspace {
    return new Workspace(flag ?? process.env.MARC_WORKSPACE ?? process.cwd());
  }

  get nichesDir() {
    return join(this.root, "niches");
  }
  nicheDir(niche: string) {
    return join(this.nichesDir, niche);
  }
  get dataDir() {
    return join(this.root, "data");
  }
  get dbPath() {
    return join(this.dataDir, "marc.db");
  }
  get snapshotsDir() {
    return join(this.dataDir, "snapshots");
  }
  get reportsDir() {
    return join(this.root, "reports");
  }
  get proposalsDir() {
    return join(this.root, "proposals");
  }
}
