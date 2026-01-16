import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Langsung arahkan user ke dashboard utama admin
  redirect('/admin/dashboard');
}