from sqlalchemy import String, Text, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
import enum


class PatientType(str, enum.Enum):
    EXTERNO = "externo"
    INTERNO = "interno"


class SectorType(str, enum.Enum):
    UE_SUS = "ue_sus"
    PA = "pa"
    PORTARIA = "portaria"


class SPDATAGuide(Base):
    __tablename__ = "spdata_guides"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    sector: Mapped[SectorType] = mapped_column(Enum(SectorType), nullable=False, index=True)
    patient_type: Mapped[PatientType] = mapped_column(Enum(PatientType), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(default=0, nullable=False)
