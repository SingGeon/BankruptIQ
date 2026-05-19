import random
import csv
import sys

random.seed(2024)

# ── Companii sănătoase pe sectoare ───────────────────────────────────────────

SECTORS = {
    "Agricultura": [
        "AgroRom SA", "FermaVerde SRL", "AgriProd SRL", "CampRom SA", "SemRom SRL",
        "GranRom SA", "FructProd SRL", "LegumaRom SA", "VitaVie SRL", "ZootehRom SA",
        "AgroGrup SA", "TeraFarm SRL", "AgroCoop SA", "BioAgro SA", "FermaRom SRL",
        "CerealRom SA", "SoiuriRom SRL", "HortRom SA", "PomicRom SRL", "AvicRom SA",
    ],
    "Constructii": [
        "ConstructPro SA", "BuildRom SRL", "TeraBuild SRL", "UrbanConst SA",
        "RoConstruct SRL", "InstalaRom SA", "ConsPro SA", "InfraRom SRL",
        "CimentRom SA", "BetonPro SRL", "ConsTrans SRL", "DevImob SRL",
        "ArchBuild SA", "ConstructSud SRL", "ProiectRom SA",
        "StrucRom SRL", "IzolatRom SA", "FinisajPro SRL", "ImobConst SA", "BuildPro SRL",
    ],
    "IT_Telecom": [
        "SoftRom SRL", "TechPro SRL", "DigiSoft SA", "InfoSys SA",
        "CloudTech SA", "DataRom SRL", "NetSoft SRL", "AppDev SA",
        "WebPro SRL", "TechHub SA", "SoftHouse SRL", "AlgoRom SRL",
        "CyberPro SRL", "DevFactory SA", "PixelSoft SRL",
        "CodeRom SRL", "SecureTech SA", "AIRom SRL", "MobileDev SA", "SaaSRom SRL",
    ],
    "Comert": [
        "RetailPro SRL", "ComercRom SA", "TradeRom SA", "ShopPro SRL",
        "DistribRom SA", "ImpexRom SA", "GrossRom SRL", "ComertPro SA",
        "MarketRom SRL", "DistribPro SRL", "RetailHub SRL", "MegaDistrib SA",
        "TradeCom SRL", "ImportRom SA", "ComercHub SRL",
        "AngrosRom SA", "MagazinPro SRL", "DistribSud SA", "ComercNord SRL", "TradeHub SA",
    ],
    "Productie": [
        "MetalRom SA", "PlastCom SRL", "ChimProd SA", "TextilRom SRL", "LemnArt SRL",
        "FabricRom SA", "IndProd SA", "ManufRom SRL", "SiderurgRom SRL",
        "AluProd SA", "ProdInd SA", "MetalCom SA", "ChimFarm SRL",
        "TextilPro SA", "WoodProd SRL",
        "AutoParts SA", "CaucRom SRL", "CeramRom SA", "SticlRom SRL", "AmbProd SA",
    ],
    "Transport_Logistica": [
        "TransRom SRL", "LogisticPro SRL", "CargoRom SA", "FreightRom SRL",
        "TransEuro SRL", "FleetPro SRL", "TransNord SA", "CargoTrans SA",
        "ExpresRom SRL", "TirRom SA", "LogiRom SA", "EuroFracht SA",
        "SpedPro SRL", "TransSud SA", "CargoEuro SRL",
        "CurierRom SRL", "DepoRom SA", "AviRom SRL", "NavRom SA", "InterTransp SRL",
    ],
    "Sanatate_Farma": [
        "MedServ SRL", "FarmaRom SA", "BioMed SRL", "MedCenter SRL",
        "FarmaCom SA", "BioFarm SA", "LabMed SRL", "MedTech SRL",
        "FarmaBio SA", "ClinicRom SA", "DiagnoRom SA", "MedPharma SA",
        "PharmaPro SRL", "BioServ SA", "MedLab SRL",
        "StomRom SRL", "OftRom SA", "OrtoPro SRL", "CardioRom SA", "RehabRom SRL",
    ],
    "Energie": [
        "EnergRom SA", "HidroTech SRL", "SolarPro SA", "ElectroProd SA",
        "GazRom SA", "EnergSud SRL", "ElectroCom SRL", "EnergPro SA",
        "RenewRom SRL", "PowerRom SRL", "PetroChem SA", "EnergHub SA",
        "ElectroTech SRL", "EnergyPro SA", "GreenPower SRL",
        "EolRom SA", "GeotermRom SRL", "BiomRom SA", "RetelRom SA", "UtilRom SRL",
    ],
    "Turism_HoReCa": [
        "TurisRom SRL", "HotelPro SA", "TravelRom SRL", "ResortRom SA",
        "VacantaRom SA", "HotelRom SA", "TurisActiv SRL", "SejurPro SA",
        "TravelPro SRL", "TurisNord SA", "ClubVacanta SA",
        "ResortPro SRL", "TurisVerde SRL", "HotelPlus SA", "EuroHotel SRL",
        "RestPro SRL", "CafeRom SA", "EventRom SRL", "SpaRom SA", "CampingRom SRL",
    ],
}

BANKRUPT_NAMES = [
    "VecheCorp SRL", "DatornicSA SA", "CrizaFirm SRL", "InsolvCo SA", "FailTech SRL",
    "DebitRom SA", "PierdereProd SRL", "RuinaCom SA", "LichidRom SRL", "FalimentSA SA",
    "NegativProfit SRL", "DeclincoCo SA", "CaderiRom SA", "PasivExces SA", "DeficitProd SRL",
    "ColapsRom SA", "InsolvServ SRL", "BancrotCo SA", "PierdeTotal SA", "CrizaMax SRL",
    "NegCash SA", "DeficitCom SRL", "RuinaFirm SA", "FalimCorp SRL", "CadereRom SA",
    "PierdereAgri SRL", "FalimConstruct SA", "InsolvIT SRL", "CrizaComert SA", "DebitProd SRL",
    "RuinaTransp SA", "LichidSanat SRL", "CadereEnerg SA", "DeficitTuris SRL", "ColapsFinan SA",
    "BancrotServ SRL", "PierdeIndustr SA", "FalimLogist SRL", "InsolvFarm SRL", "CrizaMetalurg SA",
    "DebitTextil SA", "RuinaCiment SRL", "LichidAuto SRL", "CadereAlim SA", "DeficitFarm SRL",
    "ColapsConst SRL", "BancrotAgri SA", "PierdeComert SRL", "FalimEnerg SA", "InsolvTransp SRL",
    "CrizaTuris SRL", "DebitIT SA", "RuinaRetail SRL", "LichidConstruct SA", "CadereProductie SRL",
    "DeficitAgri SA", "ColapsIT SRL", "BancrotTransp SRL", "PierdeEnerg SA", "FalimFarma SRL",
]

# ── Profile financiare pe sector (companii sănătoase) ────────────────────────
# cr=current_ratio, qr_f=quick_ratio_factor(din cr), dr=debt_ratio,
# de=debt_to_equity, npm=net_profit_margin(%), roa=ROA(%),
# roe=ROE(%), at=asset_turnover, wcr=working_capital_ratio, ic=interest_coverage

HEALTHY_PROFILES = {
    "Agricultura": dict(
        cr=(1.4, 2.8), qr_f=(0.45, 0.72), dr=(0.20, 0.50),
        de=(0.25, 1.10), npm=(2.0, 15.0), roa=(3.0, 12.0),
        roe=(5.0, 20.0), at=(0.3, 1.2), wcr=(0.10, 0.35), ic=(3.0, 12.0)
    ),
    "Constructii": dict(
        cr=(1.3, 2.2), qr_f=(0.50, 0.78), dr=(0.30, 0.55),
        de=(0.40, 1.30), npm=(3.0, 12.0), roa=(5.0, 15.0),
        roe=(10.0, 25.0), at=(0.7, 1.8), wcr=(0.10, 0.35), ic=(4.0, 15.0)
    ),
    "IT_Telecom": dict(
        cr=(2.5, 6.0), qr_f=(0.78, 0.95), dr=(0.12, 0.40),
        de=(0.14, 0.70), npm=(15.0, 38.0), roa=(15.0, 35.0),
        roe=(20.0, 50.0), at=(0.8, 2.5), wcr=(0.25, 0.55), ic=(15.0, 70.0)
    ),
    "Comert": dict(
        cr=(1.2, 2.0), qr_f=(0.30, 0.62), dr=(0.40, 0.65),
        de=(0.70, 2.00), npm=(1.0, 6.0), roa=(3.0, 10.0),
        roe=(8.0, 20.0), at=(2.0, 4.5), wcr=(0.05, 0.20), ic=(3.0, 10.0)
    ),
    "Productie": dict(
        cr=(1.5, 2.8), qr_f=(0.50, 0.80), dr=(0.25, 0.52),
        de=(0.35, 1.10), npm=(4.0, 18.0), roa=(6.0, 16.0),
        roe=(12.0, 28.0), at=(0.8, 2.0), wcr=(0.10, 0.35), ic=(5.0, 18.0)
    ),
    "Transport_Logistica": dict(
        cr=(1.2, 2.2), qr_f=(0.62, 0.88), dr=(0.35, 0.60),
        de=(0.60, 1.60), npm=(3.0, 10.0), roa=(4.0, 12.0),
        roe=(8.0, 22.0), at=(0.8, 2.2), wcr=(0.05, 0.25), ic=(3.0, 12.0)
    ),
    "Sanatate_Farma": dict(
        cr=(1.8, 4.0), qr_f=(0.68, 0.92), dr=(0.18, 0.45),
        de=(0.22, 0.90), npm=(8.0, 30.0), roa=(8.0, 25.0),
        roe=(15.0, 42.0), at=(0.8, 2.2), wcr=(0.15, 0.45), ic=(6.0, 35.0)
    ),
    "Energie": dict(
        cr=(1.3, 2.5), qr_f=(0.68, 0.90), dr=(0.35, 0.65),
        de=(0.60, 2.00), npm=(8.0, 22.0), roa=(6.0, 15.0),
        roe=(12.0, 28.0), at=(0.4, 1.2), wcr=(0.10, 0.30), ic=(4.0, 16.0)
    ),
    "Turism_HoReCa": dict(
        cr=(1.2, 2.5), qr_f=(0.68, 0.90), dr=(0.30, 0.60),
        de=(0.45, 1.60), npm=(4.0, 18.0), roa=(5.0, 15.0),
        roe=(10.0, 28.0), at=(0.6, 1.8), wcr=(0.08, 0.30), ic=(3.0, 15.0)
    ),
}


def gen_healthy(sector):
    p = HEALTHY_PROFILES[sector]
    cr = round(random.uniform(*p["cr"]), 4)
    qr = round(max(0.10, min(cr - 0.01, cr * random.uniform(*p["qr_f"]))), 4)
    dr = round(random.uniform(*p["dr"]), 4)
    de = round(random.uniform(*p["de"]), 4)
    npm = round(random.uniform(*p["npm"]), 4)
    roa = round(random.uniform(*p["roa"]), 4)
    roe = round(random.uniform(*p["roe"]), 4)
    at = round(random.uniform(*p["at"]), 4)
    wcr = round(random.uniform(*p["wcr"]), 4)
    ic = round(random.uniform(*p["ic"]), 4)
    return cr, qr, dr, de, npm, roa, roe, at, wcr, ic


def gen_bankrupt():
    cr = round(random.uniform(0.28, 0.96), 4)
    qr = round(max(0.08, min(cr - 0.01, cr * random.uniform(0.55, 0.88))), 4)
    dr = round(random.uniform(0.76, 1.58), 4)
    de = round(random.uniform(3.0, 22.0), 4)
    npm = round(random.uniform(-45.0, -2.0), 4)
    roa = round(random.uniform(-28.0, -1.0), 4)
    roe = round(random.uniform(-65.0, -5.0), 4)
    at = round(random.uniform(0.08, 0.80), 4)
    wcr = round(random.uniform(-0.55, -0.04), 4)
    ic = round(random.uniform(-6.0, 0.85), 4)
    return cr, qr, dr, de, npm, roa, roe, at, wcr, ic


# ── Generare rânduri ──────────────────────────────────────────────────────────
rows = []

# Companii sănătoase: 2-5 ani de date per companie
for sector, names in SECTORS.items():
    for name in names:
        n_years = random.randint(2, 5)
        years = sorted(random.sample(range(2017, 2024), min(n_years, 7)))
        for year in years:
            fin = gen_healthy(sector)
            rows.append((name, year, sector) + fin + (0,))

# Companii falimentate: 1-3 ani de date per companie
bankrupt_pool = list(BANKRUPT_NAMES)
random.shuffle(bankrupt_pool)
for name in bankrupt_pool:
    n_years = random.randint(1, 3)
    years = sorted(random.sample(range(2017, 2024), min(n_years, 7)))
    for year in years:
        fin = gen_bankrupt()
        rows.append((name, year, "Diverse") + fin + (1,))

random.shuffle(rows)

# ── Scriere CSV ───────────────────────────────────────────────────────────────
writer = csv.writer(sys.stdout, lineterminator='\n')
writer.writerow([
    "company_name", "year", "sector",
    "current_ratio", "quick_ratio", "debt_ratio",
    "debt_to_equity", "net_profit_margin", "return_on_assets", "return_on_equity",
    "asset_turnover", "working_capital_ratio", "interest_coverage", "is_bankrupt"
])
for row in rows:
    writer.writerow(row)
