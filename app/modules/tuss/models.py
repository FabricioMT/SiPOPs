from sqlalchemy import String, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class TUSSCode(Base):
    __tablename__ = "tuss_codes"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class TUSSUsage(Base):
    __tablename__ = "tuss_usages"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    tuss_code_id: Mapped[int] = mapped_column(ForeignKey("tuss_codes.id"), index=True, nullable=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
