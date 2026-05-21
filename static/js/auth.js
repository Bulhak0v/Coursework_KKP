document.addEventListener('DOMContentLoaded', () => {

    const googleBtns = document.querySelectorAll('.btn-google');

    googleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            Swal.fire({
                icon: 'info',
                title: 'Google Auth',
                text: 'OAuth2 integration will be implemented later.',
                background: '#161b22',
                color: '#c9d1d9'
            });
        });
    });

    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('access_token', data.access);
                    localStorage.setItem('refresh_token', data.refresh);

                    localStorage.removeItem('active_project_id');

                    window.location.href = '/';
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Authentication Failed',
                        text: 'Incorrect username or password.',
                        background: '#161b22',
                        color: '#c9d1d9'
                    });
                }
            } catch (error) {
                console.error("Login error:", error);
            }
        });
    }

    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                first_name: document.getElementById('firstName').value,
                last_name: document.getElementById('lastName').value,
                role: document.getElementById('role').value
            };

            try {
                const response = await fetch('/api/auth/register/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Account created!',
                        text: 'You can now log in with your credentials.',
                        background: '#161b22',
                        color: '#c9d1d9',
                        confirmButtonColor: '#238636'
                    }).then(() => {
                        window.location.href = '/login/';
                    });

                } else {
                    const errorData = await response.json();

                    let errorMsg = 'Check your input data.';

                    if (errorData.username) {
                        errorMsg = errorData.username[0];
                    }

                    if (errorData.password) {
                        errorMsg = errorData.password[0];
                    }

                    Swal.fire({
                        icon: 'error',
                        title: 'Registration Failed',
                        text: errorMsg,
                        background: '#161b22',
                        color: '#c9d1d9'
                    });
                }

            } catch (error) {
                console.error("Registration error:", error);
            }
        });
    }
});