import { GetServerSideProps } from 'next';
import { getDB } from '../database/db';
import Link from 'next/link';

export const getServerSideProps: GetServerSideProps = async () => {
    const db = await getDB();
    const users = await db.all('SELECT * FROM users ORDER BY totalScore DESC');
    const rooms = await db.all('SELECT * FROM rooms ORDER BY createdAt DESC LIMIT 50');
    const leaderboardRaw = await db.all('SELECT * FROM leaderboard ORDER BY lastUpdated DESC LIMIT 50');

    // Format timestamps on server to avoid hydration mismatch
    const leaderboard = leaderboardRaw.map((l: any) => ({
        ...l,
        lastUpdatedFormatted: new Date(l.lastUpdated).toLocaleTimeString()
    }));

    return {
        props: {
            users,
            rooms: rooms || [], // Rooms might be empty if table not used heavily yet
            leaderboard,
        }
    };
};

import { useState } from 'react';

export default function AdminPanel({ users, rooms, leaderboard }: any) {
    const [usersList, setUsersList] = useState(users);

    const deleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch('/api/admin/delete_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                setUsersList(usersList.filter((u: any) => u.id !== id));
            } else {
                alert('Failed to delete user');
            }
        } catch (e) {
            alert('Error deleting user');
        }
    };

    return (
        <div style={{ padding: '40px', background: '#111', minHeight: '100vh', color: 'white', fontFamily: 'monospace' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>⚡ Admin & Database Panel</h1>
                <Link href="/" style={{ color: '#22d3ee' }}>Back to Game</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
                <section style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
                    <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>👥 Users ({users.length})</h2>
                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: '#888' }}>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Score</th>
                                    <th>W/L</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map((u: any) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '5px', opacity: 0.5 }}>{u.id.substring(0,8)}...</td>
                                        <td style={{ padding: '5px', fontWeight: 'bold' }}>{u.username}</td>
                                        <td style={{ padding: '5px', color: '#fbbf24' }}>{u.totalScore}</td>
                                        <td style={{ padding: '5px' }}>{u.wins}/{u.losses}</td>
                                        <td style={{ padding: '5px' }}>
                                            <button
                                                onClick={() => deleteUser(u.id)}
                                                style={{ background: '#ef4444', border: 'none', color: 'white', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section style={{ background: '#222', padding: '20px', borderRadius: '10px' }}>
                    <h2 style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>🏆 Recent Matches ({leaderboard.length})</h2>
                    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                         <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ color: '#888' }}>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((l: any) => (
                                    <tr key={l.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '5px', opacity: 0.5 }}>{l.lastUpdatedFormatted}</td>
                                        <td style={{ padding: '5px' }}>{users.find((u:any) => u.id === l.userId)?.username || 'Unknown'}</td>
                                        <td style={{ padding: '5px', color: '#a78bfa' }}>{l.score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div style={{ marginTop: '20px', fontSize: '0.8rem', opacity: 0.6 }}>
                Status: Database Active | System Healthy
            </div>
        </div>
    );
}
