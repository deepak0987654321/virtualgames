import { getDB } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

export interface Tenant {
    tenant_id: string;
    slug: string;
    name: string;
    type: 'public' | 'private'; // Legacy, prefer visibility
    branding: any;
    visibility: 'public' | 'private';
    access_code?: string;
    allowed_games: string[];
    createdAt: string;
}

export class TenantManager {

    // Get tenant by slug
    async getTenant(slug: string): Promise<Tenant | null> {
        const db = await getDB();
        const result = await db.get('SELECT * FROM tenants WHERE slug = ?', [slug]);
        if (result) {
            // Parse JSON fields
            try { result.branding = JSON.parse(result.branding || '{}'); } catch(e) {}
            try { result.allowed_games = JSON.parse(result.allowed_games || '[]'); } catch(e) {}
        }
        return result || null;
    }

    // Get all tenants (SuperAdmin)
    async getAllTenants(): Promise<Tenant[]> {
        const db = await getDB();
        const results = await db.all('SELECT * FROM tenants ORDER BY createdAt DESC');
        return results.map(t => ({
            ...t,
            branding: JSON.parse(t.branding || '{}'),
            allowed_games: JSON.parse(t.allowed_games || '[]')
        }));
    }

    // Create a new tenant
    async createTenant(slug: string, name?: string, visibility: 'public' | 'private' = 'public', accessCode?: string): Promise<Tenant> {
        const db = await getDB();
        const tenantId = uuidv4();
        const tenantName = name || this.formatNameFromSlug(slug);
        const defaultGames = JSON.stringify(["rebus", "draw", "charades", "categories"]);

        await db.run(
            'INSERT INTO tenants (tenant_id, slug, name, type, branding, visibility, access_code, allowed_games) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [tenantId, slug, tenantName, 'public', JSON.stringify({}), visibility, accessCode || null, defaultGames]
        );

        return {
            tenant_id: tenantId,
            slug,
            name: tenantName,
            type: 'public',
            branding: {},
            visibility,
            access_code: accessCode,
            allowed_games: JSON.parse(defaultGames),
            createdAt: new Date().toISOString()
        };
    }

    // Update Tenant (SuperAdmin/Admin)
    async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
        const db = await getDB();
        const fields: string[] = [];
        const values: any[] = [];

        if (updates.visibility) { fields.push('visibility = ?'); values.push(updates.visibility); }
        if (updates.access_code !== undefined) { fields.push('access_code = ?'); values.push(updates.access_code || null); }
        if (updates.allowed_games) { fields.push('allowed_games = ?'); values.push(JSON.stringify(updates.allowed_games)); }

        if (fields.length === 0) return;

        values.push(tenantId);
        await db.run(`UPDATE tenants SET ${fields.join(', ')} WHERE tenant_id = ?`, values);
    }

    // Ensure tenant exists (Get or Create)
    async ensureTenant(slug: string): Promise<{ tenant: Tenant, created: boolean }> {
        let tenant = await this.getTenant(slug);
        if (tenant) {
            return { tenant, created: false };
        }

        tenant = await this.createTenant(slug);
        return { tenant, created: true };
    }

    // Get Tenant Users (SuperAdmin)
    async getTenantUsers(tenantId: string): Promise<any[]> {
        const db = await getDB();
        return await db.all('SELECT id, username, role, avatar, lastOnline, deviceId FROM users WHERE tenant_id = ?', [tenantId]);
    }

    // Set User Role (SuperAdmin)
    async setUserRole(userId: string, role: string): Promise<void> {
        const db = await getDB();
        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }

    // Verify Access Code
    async verifyAccess(slug: string, code: string): Promise<boolean> {
        const tenant = await this.getTenant(slug);
        if (!tenant || !tenant.access_code) return true; // Open if no code set
        return tenant.access_code === code;
    }

    private formatNameFromSlug(slug: string): string {
        return slug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

export const tenantManager = new TenantManager();
