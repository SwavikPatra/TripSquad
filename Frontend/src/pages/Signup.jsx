import { AuthForm } from '../components/AuthForm.jsx';
import API from '../services/api.js';

export default function Signup() {
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await API.post('/auth/register', {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
      });
      alert('Signup successful!');
      window.location.href = '/login';
    } catch (err) {
      alert('Signup failed!');
    }
  };

  return (
    <div>
      <h1>Sign Up</h1>
      <AuthForm type="signup" onSubmit={handleSubmit} />
    </div>
  );
}