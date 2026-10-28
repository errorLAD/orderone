import { redirect } from 'next/navigation';

export default function AdminOrdersIndexPage() {
  redirect('/admin/orders/store');
}
