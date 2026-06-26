import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/login', { replace: true }); }, []);
  return null;
}
