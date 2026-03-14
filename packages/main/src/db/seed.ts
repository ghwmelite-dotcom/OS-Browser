import { DEFAULT_GOV_PORTALS } from '@os-browser/shared';

export function seedDatabase(db: any): void {
  const count = (db.prepare('SELECT COUNT(*) as count FROM gov_portals').get() as any).count;

  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO gov_portals (name, url, category, icon_path, position, is_default, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction(() => {
      for (const portal of DEFAULT_GOV_PORTALS) {
        insert.run(
          portal.name, portal.url, portal.category,
          portal.icon_path, portal.position,
          portal.is_default ? 1 : 0, portal.is_visible ? 1 : 0
        );
      }
    });

    insertMany();
  }
}
