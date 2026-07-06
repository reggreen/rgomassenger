import Link from 'next/link';

export default function Navbar() {
  return (
    <nav>
      <ul>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/billing">Billing</Link></li>
        <li><Link href="/support">Support</Link></li>
        <li><Link href="/events">Events</Link></li>
        <li><Link href="/discussion">Discussion</Link></li>
      </ul>
    </nav>
  );
}
