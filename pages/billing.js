import Navbar from '../components/Navbar';

export default function Billing() {
  return (
    <>
      <Navbar />
      <h1>Billing</h1>
      <table>
        <tr><th>Customer</th><th>Amount</th><th>Status</th></tr>
        <tr><td>Rahim</td><td>500৳</td><td>Paid</td></tr>
      </table>
    </>
  );
}
