import { redirect } from 'next/navigation';

export default function SignupPage() {
  redirect('/account?mode=register');
}
