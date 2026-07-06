import Navbar from '../components/Navbar';

export default function Support() {
  return (
    <>
      <Navbar />
      <h1>Technical Support</h1>
      <form>
        <label>Issue:</label>
        <input type="text" name="issue" />
        <button type="submit">Submit</button>
      </form>
    </>
  );
}
