from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.modules.spdata_guides.models import PatientType, SectorType


class SPDATAGuideBase(BaseModel):
    title: str
    sector: SectorType
    patient_type: PatientType
    content: Optional[str] = None
    order_index: int = 0


class SPDATAGuideCreate(SPDATAGuideBase):
    pass


class SPDATAGuideUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order_index: Optional[int] = None

class SPDATAGuideRead(SPDATAGuideBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
