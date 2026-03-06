from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from app.core.config import settings

# A specific secret key or algorithm could be used for password resets, 
# but for simplicity we reuse the app config and add a specific scope.

def create_password_reset_token(email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived JWT token for password reset."""
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration to 15 minutes for security
        expire = datetime.utcnow() + timedelta(minutes=15)
        
    to_encode = {
        "sub": email,
        "exp": expire,
        "scope": "password_reset"
    }
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """Verify a password reset token and return the email if valid."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Verify scope to ensure this isn't a regular access token
        if payload.get("scope") != "password_reset":
            return None
            
        email: str = payload.get("sub")
        if email is None:
            return None
            
        return email
    except JWTError:
        return None

def send_reset_password_email(email: str, token: str):
    """
    Simulate sending an email with the password reset link.
    In a real application, this would integrate with SMTP/SendGrid/SES.
    """
    reset_link = f"http://localhost:5173/reset-password?token={token}"
    
    print("\n" + "="*50)
    print("📧 MOCK EMAIL DISPATCHER")
    print(f"To: {email}")
    print("Subject: Recuperação de Senha - MediCore")
    print("-" * 50)
    print("Você solicitou a recuperação da sua senha.")
    print("Clique no link abaixo para criar uma nova senha:")
    print(f"\n{reset_link}\n")
    print("Se você não solicitou isso, ignore este e-mail.")
    print("="*50 + "\n")
