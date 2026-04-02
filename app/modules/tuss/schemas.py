from pydantic import BaseModel, ConfigDict
from typing import Optional

class TUSSCodeBase(BaseModel):
    code: str
    description: str

class TUSSCodeRead(TUSSCodeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
