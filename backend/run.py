from app import create_app

app = create_app()

if __name__ == '__main__':
    print('='*50)
    print('  İş Akış Yönetim Sistemi - Backend')
    print('  http://localhost:5000')
    print('='*50)
    app.run(debug=True, port=5000)
