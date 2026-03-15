function App() {
    return (
        <div
            style={{
                minHeight: '100vh',
                fontFamily: 'Inter, system-ui, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
            }}
        >
            <h1 style={{ fontSize: '2.5rem', fontWeight: 600, margin: 0, marginBottom: '32px' }}>Devux.js</h1>

            <a
                href="https://devux.js.org/docs/what-is-devux"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    padding: '10px 24px',
                    background: '#646cff',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: 500,
                }}
            >
                View Documentation
            </a>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '48px',
                }}
            >
                <span>Created by Inas Sirhan</span>
                <a
                    href="https://linkedin.com/in/inas-sirhan"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#646cff' }}
                    title="LinkedIn"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
                <a
                    href="mailto:inassirhan@gmail.com"
                    style={{ color: '#646cff' }}
                    title="Email"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                </a>
            </div>
        </div>
    );
}

export default App;
