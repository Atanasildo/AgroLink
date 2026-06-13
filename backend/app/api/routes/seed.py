"""Rota de seed — apenas em ambiente de desenvolvimento/staging."""
import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.machine import Machine, MachineType
from app.models.transport_route import TransportRoute
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleType

router = APIRouter(prefix="/seed", tags=["Seed"])

PROVINCIAS = ["Luanda", "Huambo", "Bié", "Malanje", "Uíge", "Benguela", "Cuanza Sul"]
MUNICIPIOS = {
    "Luanda": ["Luanda", "Cacuaco", "Viana"],
    "Huambo": ["Huambo", "Caála", "Catchiungo"],
    "Bié": ["Kuito", "Camacupa", "Chinguar"],
    "Malanje": ["Malanje", "Calandula"],
    "Uíge": ["Uíge", "Negage"],
    "Benguela": ["Benguela", "Lobito"],
    "Cuanza Sul": ["Sumbe", "Amboim"],
}


def _prov_mun():
    p = random.choice(PROVINCIAS)
    m = random.choice(MUNICIPIOS[p])
    return p, m


@router.post("/machines-only", status_code=status.HTTP_201_CREATED)
def seed_machines_only(db: Session = Depends(get_db)):
    """Popula apenas máquinas de exemplo. Rápido e idempotente."""
    try:
        # Verifica se já há máquinas
        existing = db.query(Machine).first()
        if existing:
            return {"detail": "Máquinas já existem.", "seeded": False}

        # Cria um proprietário (ou usa um existente)
        proprietario = db.query(User).filter(User.role == UserRole.PROPRIETARIO_MAQUINAS).first()
        if not proprietario:
            proprietario = User(
                nome="Sofia Proprietária",
                email="proprietaria@agrolink.ao",
                hashed_password=hash_password("Agrolink@2026"),
                role=UserRole.PROPRIETARIO_MAQUINAS,
                provincia="Huambo",
                municipio="Huambo",
            )
            db.add(proprietario)
            db.flush()

        # Máquinas de exemplo
        maquinas_dados = [
            ("Trator John Deere 5075E", MachineType.TRATOR, 50000, "Trator 75CV para preparação do solo", "Huambo", "Huambo"),
            ("Colheitadeira New Holland TC5060", MachineType.COLHEITADEIRA, 75000, "Para cereais com cabina climatizada", "Huambo", "Caála"),
            ("Arado de Disco Baldan", MachineType.ARADO, 15000, "4 discos para solos argilosos", "Luanda", "Luanda"),
            ("Plantadora Semeato SHM", MachineType.PLANTADORA, 35000, "Precisão para milho e soja", "Bié", "Kuito"),
            ("Sistema de Irrigação Gotejamento", MachineType.IRRIGACAO, 25000, "Kit para 5 hectares", "Cuanza Sul", "Sumbe"),
            ("Trator Massey Ferguson 292", MachineType.TRATOR, 45000, "Bom para pequenas propriedades", "Malanje", "Malanje"),
            ("Pulverizador Jacto 600L", MachineType.OUTROS, 12000, "Pulverizador costal motorizado", "Benguela", "Benguela"),
        ]

        maquinas = []
        for nome, tipo, preco, descricao, provincia, municipio in maquinas_dados:
            m = Machine(
                nome=nome,
                tipo=tipo,
                preco_diaria=preco,
                descricao=descricao,
                provincia=provincia,
                municipio=municipio,
                proprietario_id=proprietario.id,
                disponivel=True,
            )
            maquinas.append(m)

        db.add_all(maquinas)
        db.commit()

        return {
            "detail": "Máquinas seedadas com sucesso!",
            "seeded": True,
            "count": len(maquinas),
            "maquinas": [{"nome": m.nome, "tipo": m.tipo.value, "provincia": m.provincia} for m in maquinas],
        }
    except Exception as e:
        return {"detail": "Erro ao seedar máquinas", "error": str(e)}
def seed_database(db: Session = Depends(get_db)):
    """Insere dados de exemplo. Idempotente — não duplica se já existir."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seed desativado em produção.",
        )

    if db.query(User).filter(User.email == "seed.agricultor@agrolink.ao").first():
        return {"detail": "Seed já aplicado.", "seeded": False}

    pw = hash_password("Agrolink@2026")

    agricultor = User(nome="Manuel Kaholo", email="seed.agricultor@agrolink.ao",
                      hashed_password=pw, role=UserRole.AGRICULTOR,
                      provincia="Huambo", municipio="Caála",
                      bio="Agricultor de milho e feijão no Planalto Central.")
    comprador = User(nome="Ana Ferreira", email="seed.comprador@agrolink.ao",
                     hashed_password=pw, role=UserRole.COMPRADOR,
                     provincia="Luanda", municipio="Luanda")
    transportador = User(nome="Pedro Lopes", email="seed.transportador@agrolink.ao",
                         hashed_password=pw, role=UserRole.TRANSPORTADOR,
                         provincia="Huambo", municipio="Huambo",
                         bio="10 anos de experiência em logística rural.")
    proprietario = User(nome="Sofia Nzinga", email="seed.proprietario@agrolink.ao",
                        hashed_password=pw, role=UserRole.PROPRIETARIO_MAQUINAS,
                        provincia="Bié", municipio="Kuito",
                        bio="Proprietária de tratores e colheitadeiras para aluguel.")

    db.add_all([agricultor, comprador, transportador, proprietario])
    db.flush()

    # Veículos — usando tipos que existem na BD
    veiculos = [
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.CAMINHAO,
                matricula="LD-12-34-AB", capacidade_toneladas=10),
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.CARRINHA,
                matricula="HB-56-78-CD", capacidade_toneladas=3),
        Vehicle(proprietario_id=transportador.id, tipo=VehicleType.TRATOR_CARGA,
                matricula="BI-90-12-EF", capacidade_toneladas=15),
    ]
    db.add_all(veiculos)
    db.flush()

    # Rotas
    pares = [
        ("Caála, Huambo", "Luanda"),
        ("Kuito, Bié", "Luanda"),
        ("Malanje", "Luanda"),
        ("Uíge", "Luanda"),
        ("Benguela", "Luanda"),
        ("Huambo", "Benguela"),
        ("Kuito, Bié", "Huambo"),
    ]
    rotas = []
    for i, (origem, destino) in enumerate(pares):
        data = date.today() + timedelta(days=random.randint(1, 14))
        cap = round(random.uniform(5, 15), 2)
        rotas.append(TransportRoute(
            veiculo_id=veiculos[i % len(veiculos)].id,
            transportador_id=transportador.id,
            origem=origem,
            destino=destino,
            data=data,
            preco_por_tonelada=round(random.uniform(3000, 8000), 2),
            capacidade_total_toneladas=cap,
            capacidade_disponivel_toneladas=cap,
        ))
    db.add_all(rotas)

    # Máquinas — usando tipos que existem na BD: trator, colheitadeira, arado, plantadora, irrigacao, outros
    tipos_maquinas = [
        (MachineType.TRATOR, "Trator John Deere 5075E", "Trator 75CV para lavra e preparação do solo."),
        (MachineType.COLHEITADEIRA, "Colheitadeira New Holland TC5060", "Para cereais com cabina climatizada."),
        (MachineType.ARADO, "Arado de Disco Baldan", "4 discos para solos argilosos."),
        (MachineType.PLANTADORA, "Plantadora Semeato SHM", "Plantadora de precisão para milho e soja."),
        (MachineType.IRRIGACAO, "Sistema de Irrigação por Gotejamento", "Kit completo para 5 hectares."),
    ]
    maquinas = []
    for tipo, nome, desc in tipos_maquinas:
        p, m = _prov_mun()
        maquinas.append(Machine(
            proprietario_id=proprietario.id,
            tipo=tipo,
            nome=nome,
            descricao=desc,
            preco_diaria=round(random.uniform(5000, 25000), 2),
            provincia=p,
            municipio=m,
        ))
    db.add_all(maquinas)
    db.commit()

    return {
        "detail": "Seed aplicado com sucesso!",
        "seeded": True,
        "utilizadores": ["seed.agricultor@agrolink.ao", "seed.comprador@agrolink.ao",
                         "seed.transportador@agrolink.ao", "seed.proprietario@agrolink.ao"],
        "senha": "Agrolink@2026",
        "rotas": len(rotas),
        "maquinas": len(maquinas),
    }
