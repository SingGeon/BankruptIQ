"""
Generator de date financiare realiste pentru companii românești.
Include companii listate BVB + IMM-uri pe 9 sectoare, 2019-2023.
"""

import csv
import random
import sys

random.seed(42)

# ── Companii BVB listate (date aproximate din rapoarte publice) ──────────────
BVB_COMPANIES = [
    # (name, sector, base_cr, base_dr, base_npm, base_roa, base_roe, base_at)
    ("OMV Petrom SA", "Energie", 1.45, 0.31, 14.2, 11.8, 19.4, 0.78),
    ("Romgaz SA", "Energie", 2.10, 0.18, 28.5, 18.2, 22.1, 0.64),
    ("Transgaz SA", "Energie", 1.38, 0.42, 16.8, 9.4, 14.2, 0.55),
    ("Transelectrica SA", "Energie", 1.22, 0.48, 8.4, 6.1, 11.8, 0.72),
    ("Nuclearelectrica SA", "Energie", 2.45, 0.22, 22.1, 14.5, 18.7, 0.48),
    ("Electrica SA", "Energie", 1.18, 0.52, 4.2, 3.8, 8.4, 0.88),
    ("Hidroelectrica SA", "Energie", 3.12, 0.15, 38.4, 21.2, 26.8, 0.42),
    ("Rompetrol Rafinare SA", "Energie", 1.08, 0.58, 3.1, 2.4, 7.2, 1.24),
    ("BRD Groupe Societe Generale SA", "Diverse", 1.42, 0.85, 18.4, 1.8, 14.2, 0.18),
    ("Banca Transilvania SA", "Diverse", 1.38, 0.88, 22.1, 2.1, 16.8, 0.14),
    ("TLV Financial Group SA", "Diverse", 1.34, 0.86, 19.8, 1.9, 15.4, 0.16),
    ("Erste Group Bank", "Diverse", 1.41, 0.87, 20.4, 1.7, 13.8, 0.12),
    ("Bursa de Valori Bucuresti SA", "Diverse", 4.82, 0.12, 42.8, 28.4, 34.2, 0.92),
    ("Antibiotice SA", "Sanatate_Farma", 2.84, 0.28, 12.4, 9.8, 14.2, 0.88),
    ("Biofarm SA", "Sanatate_Farma", 3.12, 0.18, 18.2, 14.8, 18.4, 0.94),
    ("Zentiva SA", "Sanatate_Farma", 2.24, 0.34, 14.8, 11.2, 16.8, 0.82),
    ("Medlife SA", "Sanatate_Farma", 1.82, 0.48, 8.4, 6.2, 14.8, 0.72),
    ("Regina Maria SA", "Sanatate_Farma", 1.68, 0.52, 7.2, 5.4, 12.8, 0.68),
    ("Teraplast SA", "Productie", 2.14, 0.38, 8.4, 6.8, 12.4, 1.12),
    ("Alro SA", "Productie", 1.48, 0.52, 5.8, 4.2, 9.8, 1.84),
    ("Stirom SA", "Productie", 1.68, 0.44, 6.4, 5.1, 10.4, 0.98),
    ("Prefab SA", "Constructii", 1.84, 0.42, 7.8, 6.2, 12.8, 1.24),
    ("Societatea de Investitii Financiare Banat Crisana SA", "Diverse", 5.42, 0.08, 38.4, 12.4, 14.2, 0.24),
    ("Societatea de Investitii Financiare Moldova SA", "Diverse", 4.88, 0.09, 36.2, 11.8, 13.8, 0.22),
    ("Societatea de Investitii Financiare Muntenia SA", "Diverse", 4.92, 0.10, 37.8, 12.2, 14.0, 0.21),
    ("Fondul Proprietatea SA", "Diverse", 6.24, 0.06, 44.2, 14.8, 16.2, 0.18),
    ("Impact Developer Contractor SA", "Constructii", 1.42, 0.58, 12.8, 8.4, 18.4, 0.38),
    ("One United Properties SA", "Constructii", 1.88, 0.48, 24.2, 14.8, 22.4, 0.42),
    ("Digi Communications NV", "IT_Telecom", 0.98, 0.72, 8.4, 4.8, 18.4, 0.68),
    ("Telecom SA", "IT_Telecom", 1.12, 0.62, 6.8, 4.2, 12.8, 0.74),
    ("TotalSoft SA", "IT_Telecom", 2.84, 0.24, 18.4, 14.2, 22.8, 1.24),
    ("Softwin SRL", "IT_Telecom", 3.12, 0.18, 22.4, 18.8, 28.4, 1.42),
    ("Cegeka Romania SRL", "IT_Telecom", 2.94, 0.22, 16.8, 12.4, 20.4, 1.18),
    ("AROBS Transilvania Software SA", "IT_Telecom", 2.48, 0.32, 14.2, 10.8, 18.4, 1.08),
    ("Aerotravel SA", "Turism_HoReCa", 0.84, 0.68, -4.2, -2.8, -8.4, 0.82),
    ("Turism Felix SA", "Turism_HoReCa", 1.24, 0.54, 4.2, 3.2, 8.4, 0.68),
    ("Neptun Complex SA", "Turism_HoReCa", 1.48, 0.48, 6.4, 4.8, 10.4, 0.54),
    ("Bermas SA", "Productie", 1.82, 0.42, 7.2, 5.8, 11.4, 0.88),
    ("Cemacon SA", "Constructii", 1.94, 0.46, 9.8, 7.4, 14.8, 0.92),
    ("Conpet SA", "Transport_Logistica", 2.84, 0.24, 18.4, 14.2, 18.8, 0.92),
    ("Oil Terminal SA", "Transport_Logistica", 1.42, 0.54, 6.8, 5.2, 10.8, 0.72),
    ("Compa SA", "Productie", 1.68, 0.48, 6.4, 4.8, 10.4, 1.14),
    ("Rompetrol Well Services SA", "Energie", 1.22, 0.62, 4.2, 3.1, 8.4, 0.84),
    ("Vrancart SA", "Productie", 1.88, 0.44, 8.4, 6.8, 12.8, 0.94),
    ("Prodplast SA", "Productie", 1.72, 0.48, 7.2, 5.6, 11.2, 0.88),
    ("Artego SA", "Productie", 1.84, 0.44, 8.8, 7.2, 13.4, 1.02),
    ("Condmag SA", "Constructii", 1.64, 0.52, 6.4, 4.8, 10.4, 1.12),
    ("Electromagnetica SA", "Productie", 2.14, 0.38, 9.4, 7.8, 14.2, 0.96),
    ("Farmaceutica Remedia SA", "Sanatate_Farma", 2.42, 0.34, 10.8, 8.4, 14.4, 0.98),
    ("Altur SA", "Productie", 1.78, 0.46, 7.8, 6.2, 12.4, 0.94),
    ("Azomures SA", "Productie", 1.42, 0.58, 5.8, 4.2, 9.8, 1.18),
    ("Boromir Prod SA", "Productie", 1.62, 0.52, 5.4, 4.2, 9.2, 1.28),
    ("Carbochim SA", "Productie", 2.24, 0.34, 11.4, 9.2, 15.8, 0.88),
    ("Cmp SA", "Productie", 1.82, 0.44, 8.2, 6.8, 12.4, 0.98),
    ("Mccain Romania SRL", "Agricultura", 1.48, 0.52, 6.4, 4.8, 10.4, 1.12),
    ("Agricover SA", "Agricultura", 1.38, 0.62, 8.4, 6.2, 14.8, 0.92),
    ("AgroInvest SA", "Agricultura", 1.24, 0.58, 4.8, 3.6, 8.4, 0.84),
    ("Complexul Energetic Oltenia SA", "Energie", 0.88, 0.72, -2.4, -1.8, -6.2, 0.64),
    ("Romcab SA", "Productie", 1.54, 0.56, 4.8, 3.6, 8.4, 1.48),
    ("Sife SA", "Diverse", 3.84, 0.14, 28.4, 16.2, 18.8, 0.34),
]

# ── Profile sector pentru companii IMM ──────────────────────────────────────
SECTOR_PROFILES = {
    "Agricultura": dict(
        cr=(1.2, 2.8), dr=(0.20, 0.55), npm=(2.0, 18.0),
        roa=(3.0, 14.0), roe=(5.0, 22.0), at=(0.3, 1.4),
        wcr=(0.08, 0.38), ic=(3.0, 14.0), qr_f=(0.40, 0.72)
    ),
    "Constructii": dict(
        cr=(1.2, 2.4), dr=(0.28, 0.60), npm=(3.0, 14.0),
        roa=(4.0, 16.0), roe=(8.0, 26.0), at=(0.6, 2.0),
        wcr=(0.08, 0.36), ic=(3.5, 16.0), qr_f=(0.45, 0.78)
    ),
    "IT_Telecom": dict(
        cr=(2.2, 6.5), dr=(0.10, 0.40), npm=(14.0, 42.0),
        roa=(14.0, 38.0), roe=(20.0, 55.0), at=(0.7, 2.8),
        wcr=(0.22, 0.58), ic=(14.0, 75.0), qr_f=(0.75, 0.96)
    ),
    "Comert": dict(
        cr=(1.1, 2.2), dr=(0.38, 0.68), npm=(1.0, 7.0),
        roa=(2.5, 11.0), roe=(7.0, 22.0), at=(1.8, 5.0),
        wcr=(0.04, 0.22), ic=(2.5, 11.0), qr_f=(0.28, 0.62)
    ),
    "Productie": dict(
        cr=(1.4, 2.8), dr=(0.24, 0.56), npm=(4.0, 20.0),
        roa=(5.0, 18.0), roe=(10.0, 30.0), at=(0.8, 2.2),
        wcr=(0.08, 0.36), ic=(4.5, 20.0), qr_f=(0.48, 0.82)
    ),
    "Transport_Logistica": dict(
        cr=(1.1, 2.2), dr=(0.32, 0.64), npm=(2.5, 12.0),
        roa=(3.5, 14.0), roe=(7.0, 24.0), at=(0.7, 2.4),
        wcr=(0.04, 0.26), ic=(2.8, 14.0), qr_f=(0.58, 0.90)
    ),
    "Sanatate_Farma": dict(
        cr=(1.8, 4.5), dr=(0.15, 0.46), npm=(8.0, 34.0),
        roa=(8.0, 28.0), roe=(14.0, 46.0), at=(0.7, 2.4),
        wcr=(0.14, 0.48), ic=(6.0, 38.0), qr_f=(0.65, 0.94)
    ),
    "Energie": dict(
        cr=(1.2, 2.8), dr=(0.32, 0.68), npm=(7.0, 28.0),
        roa=(5.5, 18.0), roe=(10.0, 30.0), at=(0.3, 1.4),
        wcr=(0.08, 0.32), ic=(3.5, 18.0), qr_f=(0.65, 0.92)
    ),
    "Turism_HoReCa": dict(
        cr=(1.1, 2.6), dr=(0.28, 0.64), npm=(3.5, 20.0),
        roa=(4.5, 17.0), roe=(8.5, 30.0), at=(0.5, 1.9),
        wcr=(0.06, 0.32), ic=(2.8, 17.0), qr_f=(0.65, 0.92)
    ),
}

# ── Companii IMM pe sectoare (9 sectoare × ~100 companii) ──────────────────
IMM_COMPANIES = {
    "Agricultura": [
        "AgroRom SA", "FermaVerde SRL", "AgriProd SRL", "CampRom SA", "SemRom SRL",
        "GranRom SA", "FructProd SRL", "LegumaRom SA", "VitaVie SRL", "ZootehRom SA",
        "AgroGrup SA", "TeraFarm SRL", "AgroCoop SA", "BioAgro SA", "FermaRom SRL",
        "CerealRom SA", "SoiuriRom SRL", "HortRom SA", "PomicRom SRL", "AvicRom SA",
        "GrauRom SA", "FlorRom SRL", "SerRom SA", "PomuRom SRL", "OiRom SA",
        "VineaRom SA", "PasaRom SRL", "CampProd SA", "AgroEco SRL", "PajiRom SA",
        "VitaAgro SA", "PomiRom SRL", "ZernoRom SA", "AgriSud SRL", "FarmAgro SA",
        "GrupoAgro SRL", "ProFructe SA", "EcoBio SRL", "NaturFarm SA", "AgriNord SA",
        "IonutAgri SRL", "CristalSoil SA", "RomAgriPro SRL", "GreenFarm SA", "BioHort SRL",
        "AgriCentr SA", "GranaRom SRL", "PomoRom SA", "ZarzaRom SRL", "ViticRom SA",
        "SilvicAgro SA", "CampVerde SRL", "AgroMold SA", "BunaRod SRL", "AgroOlt SA",
        "TeraVerde SA", "SolaRom SRL", "IrigRom SA", "PlantPro SRL", "GradinRom SA",
        "SeraCentru SRL", "FraguRom SA", "CiupRom SRL", "PasareRom SA", "BovineRom SA",
        "OvineRom SRL", "CapraRom SA", "ApiculRom SRL", "FishRom SA", "StiuRom SRL",
        "TreierRom SA", "PloaieRom SRL", "SemVerde SA", "AgroTransilv SRL", "CampMold SA",
        "LotusFarm SRL", "FloraCampului SA", "GrauAlb SRL", "ButelieSRL SA", "LapteRom SRL",
        "CarneSec SA", "BranzaRom SRL", "MereRom SA", "PruneRom SRL", "VisinaRom SA",
        "CireRom SA", "AbricotRom SRL", "PepRom SA", "TomaRom SRL", "ArdeRom SRL",
        "VarzaRom SA", "CepRom SRL", "UstRom SA", "MorcRom SRL", "PastRom SA",
        "CanepRom SA", "InRom SRL", "FloriRom SA", "HerbaRom SRL", "PlantMed SA",
    ],
    "Constructii": [
        "ConstructPro SA", "BuildRom SRL", "TeraBuild SRL", "UrbanConst SA",
        "RoConstruct SRL", "InstalaRom SA", "ConsPro SA", "InfraRom SRL",
        "CimentRom SA", "BetonPro SRL", "ConsTrans SRL", "DevImob SRL",
        "ArchBuild SA", "ConstructSud SRL", "ProiectRom SA",
        "StrucRom SRL", "IzolatRom SA", "FinisajPro SRL", "ImobConst SA", "BuildPro SRL",
        "ZidRom SA", "FundRom SRL", "AcoperRom SA", "FereastrRom SRL", "UsRom SA",
        "PardoRom SA", "VopsRom SRL", "SanitRom SA", "ElecConst SA", "GazConst SRL",
        "TerConst SA", "AsfConst SA", "BetConst SRL", "MetConst SA", "LemnConst SRL",
        "MarmConst SA", "GrafConst SRL", "ImpConst SA", "RecConst SRL", "ManConst SA",
        "ConstrNord SA", "ConstrSud SRL", "ConstrEst SA", "ConstrVest SRL",
        "TubRom SA", "CablConst SRL", "AntenRom SA", "TeleConst SRL", "NetConst SA",
        "CaleConst SA", "PodConst SRL", "TunConst SA", "AeroConst SA", "PortConst SRL",
        "CanalConst SA", "ApaConst SRL", "EpurConst SA", "SiloConst SRL", "HalaConst SA",
        "BirouConst SA", "ComercConst SRL", "HotelConst SA", "ClinicConst SRL",
        "ScloConst SA", "SportConst SRL", "CultConst SA", "RelConst SRL",
        "MilitConst SA", "SectConst SRL", "MunicConst SA", "JudConst SRL",
        "NatConst SA", "RegConst SRL", "LocalConst SA", "ComConst SRL",
        "PrimConst SA", "ConsConst SRL", "GuvConst SA", "MinConst SRL",
        "AgenConst SA", "InstConst SRL", "AutConst SA", "PubConst SRL",
        "PrivConst SA", "IndConst SRL", "ComConst2 SA", "AgriConst SRL",
        "TransConst SA", "ServConst SRL", "MedConst SA", "EduConst SRL",
        "CultConst2 SA", "SportConst2 SRL", "TurisConst SA", "HorecConst SRL",
        "AlimConst SA", "BautConst SRL", "TextConst SA", "PielConst SRL",
        "LemnConst2 SA", "ChimConst SRL", "FarmConst SA", "CosConst SRL",
    ],
    "IT_Telecom": [
        "SoftRom SRL", "TechPro SRL", "DigiSoft SA", "InfoSys SA",
        "CloudTech SA", "DataRom SRL", "NetSoft SRL", "AppDev SA",
        "WebPro SRL", "TechHub SA", "SoftHouse SRL", "AlgoRom SRL",
        "CyberPro SRL", "DevFactory SA", "PixelSoft SRL",
        "CodeRom SRL", "SecureTech SA", "AIRom SRL", "MobileDev SA", "SaaSRom SRL",
        "CloudFirst SA", "DevOps SRL", "DataBridge SA", "APIRom SRL", "UIRom SA",
        "UXRom SRL", "DesignTech SA", "AnimRom SRL", "GameDev SA", "VRRom SRL",
        "ARRom SA", "IoTRom SRL", "BlockRom SA", "CryptoSoft SA", "FinTech SRL",
        "InsurTech SA", "PropTech SRL", "HealthTech SA", "EduTech SRL",
        "AgriTech SA", "GreenTech SRL", "CleanTech SA", "EnerTech SRL",
        "MobiTech SA", "AutoTech SRL", "LogiTech SA", "SupplyTech SRL",
        "ManufTech SA", "RetailTech SRL", "TravelTech SA", "FoodTech SRL",
        "SpaceTech SA", "DefTech SRL", "MilTech SA", "CivTech SRL",
        "GovTech SA", "SmartCity SRL", "E-Gov SA", "DigiGov SRL",
        "OpenData SA", "BigData SRL", "MLRom SA", "DeepLearn SRL",
        "NLP Rom SA", "VisionRom SRL", "RobotRom SA", "AutoRob SRL",
        "DroneRom SA", "SatRom SRL", "WifiRom SA", "FiberRom SRL",
        "5GRom SA", "CableRom SRL", "SatelRom SA", "RadioRom SRL",
        "TVRom SA", "StreamRom SRL", "PodRom SA", "ContentRom SRL",
        "MediaRom SA", "PressRom SRL", "AdRom SA", "MarketRom SRL",
        "SEORom SA", "SocialRom SRL", "EmailRom SA", "SMSRom SRL",
        "CRMRom SA", "ERPRom SRL", "HRTech SA", "AccTech SRL",
        "LegalTech SA", "CompTech SRL", "AuditTech SA", "TaxTech SRL",
        "PayRom SA", "BankTech SRL", "InvestTech SA", "WealthTech SRL",
    ],
    "Comert": [
        "RetailPro SRL", "ComercRom SA", "TradeRom SA", "ShopPro SRL",
        "DistribRom SA", "ImpexRom SA", "GrossRom SRL", "ComertPro SA",
        "MarketRom SRL", "DistribPro SRL", "RetailHub SRL", "MegaDistrib SA",
        "TradeCom SRL", "ImportRom SA", "ComercHub SRL",
        "AngrosRom SA", "MagazinPro SRL", "DistribSud SA", "ComercNord SRL", "TradeHub SA",
        "ShopCity SRL", "MallRom SA", "SuperRom SRL", "HiperRom SA", "DiscRom SRL",
        "OurPrice SRL", "CostRom SA", "ValueRom SRL", "DealRom SA", "OfferRom SRL",
        "PriceRom SA", "SaleRom SRL", "ClearRom SA", "LiqRom SRL", "StocRom SA",
        "WareRom SA", "StorRom SRL", "ShelfRom SA", "RackRom SRL", "ShopOnline SA",
        "ECommRom SRL", "WebShop SA", "NetShop SRL", "OnlineRom SA", "ClickRom SRL",
        "OrderRom SA", "DelivRom SRL", "CourRom SA", "SendRom SRL", "ExpRom SA",
        "AlimRom SRL", "BevRom SA", "AlcRom SRL", "TobRom SA", "CoffRom SRL",
        "TeaRom SA", "JuiceRom SRL", "WaterRom SA", "SoftDrRom SRL",
        "CosRom SA", "BeauRom SRL", "HairRom SA", "SkinRom SRL",
        "ClothRom SA", "FashRom SRL", "SportRet SA", "OutdoRom SRL",
        "ToyRom SA", "GameRet SRL", "BookRom SA", "MusicRom SRL",
        "ElectRet SA", "HomeRom SRL", "GardRom SA", "PetRom SRL",
        "CarRom SA", "BikeRom SRL", "MotoRom SA", "TruckRom SRL",
        "FurnRom SA", "DecoRom SRL", "ArtRom SA", "CraftRom SRL",
        "GiftRom SA", "FlorRet SA", "JewRom SRL", "LuxRom SA",
        "VintRom SRL", "SecHandRom SA", "RentRom SRL", "LeasRom SA",
        "LendRom SA", "BorRom SRL", "ShareRom SA", "SubscRom SRL",
    ],
    "Productie": [
        "MetalRom SA", "PlastCom SRL", "ChimProd SA", "TextilRom SRL", "LemnArt SRL",
        "FabricRom SA", "IndProd SA", "ManufRom SRL", "SiderurgRom SRL",
        "AluProd SA", "ProdInd SA", "MetalCom SA", "ChimFarm SRL",
        "TextilPro SA", "WoodProd SRL",
        "AutoParts SA", "CaucRom SRL", "CeramRom SA", "SticlRom SRL", "AmbProd SA",
        "OtelRom SA", "FontRom SRL", "ZincRom SA", "CuprRom SRL", "PlumbRom SA",
        "NicheRom SA", "TitanRom SRL", "InoxRom SA", "CromRom SRL", "MoliRom SA",
        "TungRom SA", "VanRom SRL", "NiobRom SA", "TanRom SRL", "BeriRom SA",
        "MagnRom SA", "SiliRom SRL", "FosRom SA", "SulRom SRL", "AzotRom SA",
        "ClorRom SA", "FlourRom SRL", "BromRom SA", "IodRom SRL", "OxiRom SA",
        "HidroRom SA", "AzRom SRL", "CarRom SA", "NitRom SRL", "SulfRom SA",
        "AcidRom SA", "SodRom SRL", "PotRom SA", "CalRom SRL", "MagRom SA",
        "FerRom SA", "ManRom SRL", "CobRom SA", "NickRom SRL", "CromSRL SA",
        "MolibRom SA", "TungsRom SRL", "VolfRom SA", "UranRom SRL",
        "ThoriRom SA", "RadRom SRL", "ActRom SA", "LantRom SRL",
        "CeriRom SA", "PraRom SRL", "NeodRom SA", "SamaRom SRL",
        "EurRom SA", "GadRom SRL", "TerRom SA", "DyspRom SRL",
        "HolmRom SA", "ErbRom SRL", "ThuRom SA", "YterRom SRL",
        "LuteRom SA", "ScandRom SRL", "YtriRom SA", "ZircRom SRL",
        "NiobRom2 SA", "TantRom SRL", "HafnRom SA", "TantRom2 SRL",
        "RheRom SA", "OsmRom SRL", "IridRom SA", "PlatRom SRL",
        "PaladRom SA", "RodiRom SRL", "SilverRom SA", "GoldRom SRL",
    ],
    "Transport_Logistica": [
        "TransRom SRL", "LogisticPro SRL", "CargoRom SA", "FreightRom SRL",
        "TransEuro SRL", "FleetPro SRL", "TransNord SA", "CargoTrans SA",
        "ExpresRom SRL", "TirRom SA", "LogiRom SA", "EuroFracht SA",
        "SpedPro SRL", "TransSud SA", "CargoEuro SRL",
        "CurierRom SRL", "DepoRom SA", "AviRom SRL", "NavRom SA", "InterTransp SRL",
        "RoadRom SA", "RailRom SRL", "AirRom SA", "SeaRom SRL", "RiverRom SA",
        "PipeRom SA", "ConvRom SRL", "LiftRom SA", "CraneRom SRL", "ForkRom SA",
        "PalRom SA", "BoxRom SRL", "ContRom SA", "TankRom SRL", "SiloTrans SA",
        "RefrigRom SRL", "FreezTrans SA", "HazTrans SRL", "BulkRom SA", "BreakRom SRL",
        "RoRoRom SA", "LoLoRom SRL", "FoFoRom SA", "DriveRom SRL", "PilotRom SA",
        "DispRom SA", "NaviRom SRL", "CustomRom SA", "InsurTrans SRL",
        "FinTrans SA", "LeasTrans SRL", "RentTrans SA", "FixTrans SRL",
        "MaintRom SA", "RepairTrans SRL", "WashTrans SA", "FuelRom SRL",
        "ParkRom SA", "GarageRom SRL", "TrailerRom SA", "SemiRom SRL",
        "TruckinRom SA", "VanTrans SRL", "BusTrans SA", "TaxiRom SRL",
        "RidRom SA", "ShareRide SA", "PoolRom SRL", "ShuttRom SA",
        "AmbRom SRL", "MedTransp SA", "VetTransp SRL", "SchTransp SA",
        "MilTransp SA", "PolTransp SRL", "FireTransp SA", "EmerRom SRL",
        "PostRom SA", "MailRom SRL", "PackRom SA", "ParcelRom SRL",
        "SameDay SA", "NextDay SRL", "ExpressCour SA", "MotoCour SRL",
        "BicyCour SA", "DroneCour SRL", "RobCour SA", "AutoCour SRL",
        "ManCour SA", "WomCour SRL", "YouthCour SA", "VetCour SRL",
        "LuxCour SA", "EcoCour SRL", "GreenCour SA", "NightCour SRL",
        "DayCour SA", "WeekCour SRL", "MonthCour SA", "YearCour SRL",
    ],
    "Sanatate_Farma": [
        "MedServ SRL", "FarmaRom SA", "BioMed SRL", "MedCenter SRL",
        "FarmaCom SA", "BioFarm SA", "LabMed SRL", "MedTech SRL",
        "FarmaBio SA", "ClinicRom SA", "DiagnoRom SA", "MedPharma SA",
        "PharmaPro SRL", "BioServ SA", "MedLab SRL",
        "StomRom SRL", "OftRom SA", "OrtoPro SRL", "CardioRom SA", "RehabRom SRL",
        "NuroRom SA", "PsihRom SRL", "OncoRom SA", "HemaRom SRL",
        "GastroRom SA", "HepaRom SRL", "NefroRom SA", "UroRom SRL",
        "GineRom SA", "MatRom SRL", "PedRom SA", "NeonatRom SRL",
        "GerRom SA", "PaliRom SRL", "EmergRom SA", "UCIRom SRL",
        "AnesRom SA", "ChirRom SRL", "PlasChir SA", "OrtChir SRL",
        "CardChir SA", "NuroChir SRL", "TorChir SA", "AbdChir SRL",
        "TransplRom SA", "DializRom SRL", "KinetRom SA", "ErgRom SRL",
        "LogopRom SA", "PsihoteRom SRL", "NutritRom SA", "DietRom SRL",
        "FitnessRom SA", "WellnessRom SRL", "SpaRom SA", "ThalRom SRL",
        "BalnRom SA", "RecuperRom SRL", "PrevenRom SA", "ScreenRom SRL",
        "VaccinRom SA", "ImunoRom SRL", "AlergRom SA", "PneumoRom SRL",
        "ReumaRom SA", "DermaRom SRL", "VenerRom SA", "EpidRom SRL",
        "HigRom SA", "SanatPub SRL", "MedMunc SA", "MedSport SRL",
        "MedMil SA", "MedAvia SRL", "MedMar SA", "MedFerRom SRL",
        "VetRom SA", "FarmaVet SRL", "LabVet SA", "ClinicVet SRL",
        "ZooVet SA", "AquaVet SRL", "PasaVet SA", "BovVet SRL",
        "OvVet SA", "PorcVet SRL", "AvicVet SA", "EquiVet SRL",
        "CanVet SA", "FeliVet SRL", "ExoVet SA", "ZooVet2 SRL",
        "MedAlt SA", "HomRom SRL", "NatMed SA", "AcupRom SRL",
    ],
    "Energie": [
        "EnergRom SA", "HidroTech SRL", "SolarPro SA", "ElectroProd SA",
        "GazRom SA", "EnergSud SRL", "ElectroCom SRL", "EnergPro SA",
        "RenewRom SRL", "PowerRom SRL", "PetroChem SA", "EnergHub SA",
        "ElectroTech SRL", "EnergyPro SA", "GreenPower SRL",
        "EolRom SA", "GeotermRom SRL", "BiomRom SA", "RetelRom SA", "UtilRom SRL",
        "SolarCell SA", "WindRom SRL", "HydroRom SA", "TidalRom SRL",
        "WaveRom SA", "GeothRom SRL", "BioGazRom SA", "BioDiesel SRL",
        "BioEtanol SA", "PelatRom SRL", "BriRom SA", "CharbRom SRL",
        "LignRom SA", "TurfRom SRL", "PeatRom SA", "NatGasRom SRL",
        "LPGRom SA", "LNGRom SRL", "CNG ROM SA", "H2Rom SRL",
        "AmmRom SA", "MetanRom SRL", "PropaRom SA", "ButaRom SRL",
        "HexaRom SA", "HeptaRom SRL", "OctaRom SA", "DecanRom SRL",
        "UranRom2 SA", "ThoriRom2 SRL", "PlutonRom SA", "ActRom2 SRL",
        "FusRom SA", "FisRom SRL", "FuelRom SA", "CokeRom SRL",
        "CoalRom SA", "AshRom SRL", "SlagRom SA", "FlueRom SRL",
        "ScrubRom SA", "FilterRom SRL", "ChimRom SA", "GipRom SRL",
        "NitriRom SA", "SulpRom SRL", "HydroClRom SA", "NaOHRom SRL",
        "ClRom SA", "BrRom SRL", "FRom SA", "IRom SRL",
        "NRom SA", "ORom SRL", "SRom SA", "PRom SRL",
        "CaRom SA", "MgRom SRL", "NaRom SA", "KRom SRL",
        "LiRom SA", "BeRom SRL", "BRom SA", "AlRom SRL",
        "SiRom SA", "GeRom SRL", "AsRom SA", "SbRom SRL",
        "BiRom SA", "TeRom SRL", "SeRom SA", "PoRom SRL",
    ],
    "Turism_HoReCa": [
        "TurisRom SRL", "HotelPro SA", "TravelRom SRL", "ResortRom SA",
        "VacantaRom SA", "HotelRom SA", "TurisActiv SRL", "SejurPro SA",
        "TravelPro SRL", "TurisNord SA", "ClubVacanta SA",
        "ResortPro SRL", "TurisVerde SRL", "HotelPlus SA", "EuroHotel SRL",
        "RestPro SRL", "CafeRom SA", "EventRom SRL", "SpaRom SA", "CampingRom SRL",
        "PensRom SA", "VilRom SRL", "ApartRom SA", "MotelRom SRL",
        "HosByRom SA", "BookRom SRL", "ReservRom SA", "CheckRom SRL",
        "ReceptRom SA", "ConciRom SRL", "BellRom SA", "VaRom SRL",
        "HousRom SA", "ChefRom SRL", "CookRom SA", "GrilRom SRL",
        "BBQRom SA", "BuffRom SRL", "CantiRom SA", "CateringRom SRL",
        "PizRom SA", "BurRom SRL", "SandRom SA", "WrapRom SRL",
        "SushiRom SA", "ChineseRom SRL", "GreekRom SA", "ItaliRom SRL",
        "FrenchRom SA", "SpanRom SRL", "TurcRom SA", "IndiaRom SRL",
        "MexRom SA", "JapoRom SRL", "KoreeRom SA", "ThaRom SRL",
        "VietRom SA", "BalineRom SRL", "MarocRom SA", "LibanRom SRL",
        "IzrRom SA", "ArabRom SRL", "PersRom SA", "AfgRom SRL",
        "EtiopRom SA", "NigRom SRL", "GhanaRom SA", "KeniaRom SRL",
        "TanzRom SA", "MozRom SRL", "ZimRom SA", "SAfRom SRL",
        "BrazRom SA", "ArgRom SRL", "ChiRom SA", "PerRom SRL",
        "ColRom SA", "VenRom SRL", "EcuRom SA", "BoliRom SRL",
        "ParagRom SA", "UruRom SRL", "GuyRom SA", "SuriRom SRL",
        "BarRom SA", "JamRom SRL", "CubaRom SA", "HaiRom SRL",
    ],
}

# ── Companii falimentate ─────────────────────────────────────────────────────
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
    "InsolvConst SRL", "CrizaProd SA", "DebitAgri SRL", "RuinaIT SA", "LichidComert SRL",
    "FalimTuris SA", "ColapsProductie SRL", "BancrotFarma SA", "PierdeConst SRL", "InsolvComert SA",
    "CrizaAgri SRL", "DebitConstruct SA", "RuinaFarma SRL", "LichidProd SA", "FalimComert SRL",
    "DeficitIT SA", "BancrotProd SRL", "InsolvTuris SA", "CrizaConstruct SRL", "DebitFarma SA",
    "RuinaAgri SRL", "LichidIT SA", "FalimConstruct2 SA", "ColapsComert SRL", "DeficitProd2 SA",
    "BancrotTuris SA", "PierdeIT SRL", "InsolvAgri SA", "CrizaFarma SRL", "DebitTuris SA",
    "RuinaProd SA", "LichidAgri SRL", "FalimIT SA", "ColapsConst2 SRL", "BancrotComert2 SA",
    "DebitProd2 SA", "InsolvIT2 SRL", "CrizaComert2 SA", "RuinaConst SA", "LichidTuris SRL",
    "FalimAgri2 SA", "ColapsIT2 SRL", "BancrotFarma2 SA", "PierdeComert2 SA", "InsolvProd2 SA",
    "CrizaTuris2 SRL", "DebitConst SA", "RuinaFarma2 SRL", "LichidComert2 SA", "DeficitConst2 SRL",
    "BancrotAgri2 SA", "PierdeEnerg2 SRL", "InsolvTuris2 SA", "CrizaProd2 SRL", "DebitIT2 SA",
    "RuinaComert SA", "LichidFarma SA", "FalimProd2 SRL", "ColapsAgri SA", "InsolvConst2 SRL",
    "DeficitTuris2 SRL", "BancrotProd2 SA", "PierdeAgri2 SRL", "CrizaIT SRL", "DebitFarma2 SA",
]


def uniform(lo, hi): return random.uniform(lo, hi)
def rnd(x, d=4): return round(x, d)


def gen_healthy(sector):
    p = SECTOR_PROFILES[sector]
    cr = rnd(uniform(*p["cr"]))
    qr = rnd(max(0.08, min(cr - 0.01, cr * uniform(*p["qr_f"]))))
    dr = rnd(uniform(*p["dr"]))
    de = rnd(max(0.05, dr / max(0.02, 1 - dr) * uniform(0.85, 1.15)))
    npm = rnd(uniform(*p["npm"]))
    roa = rnd(uniform(*p["roa"]))
    roe = rnd(uniform(*p["roe"]))
    at = rnd(uniform(*p["at"]))
    wcr = rnd(uniform(*p["wcr"]))
    ic = rnd(uniform(*p["ic"]))
    return cr, qr, dr, de, npm, roa, roe, at, wcr, ic


def gen_bankrupt():
    cr = rnd(uniform(0.22, 0.90))
    qr = rnd(max(0.05, min(cr - 0.01, cr * uniform(0.50, 0.85))))
    dr = rnd(uniform(0.72, 1.65))
    de = rnd(uniform(3.5, 25.0))
    npm = rnd(uniform(-52.0, -1.5))
    roa = rnd(uniform(-32.0, -0.8))
    roe = rnd(uniform(-75.0, -4.0))
    at = rnd(uniform(0.06, 0.75))
    wcr = rnd(uniform(-0.62, -0.03))
    ic = rnd(uniform(-7.0, 0.75))
    return cr, qr, dr, de, npm, roa, roe, at, wcr, ic


def gen_bvb_row(base, year, noise=0.08):
    """Generează datele financiare pentru un an, adăugând zgomot realist."""
    _, sector, bcr, bdr, bnpm, broa, broe, bat = base[:8]
    noise_f = lambda x: x * (1 + random.gauss(0, noise))
    cr = rnd(max(0.5, noise_f(bcr)))
    dr = rnd(max(0.05, min(0.98, noise_f(bdr))))
    qr = rnd(max(0.08, cr * random.uniform(0.55, 0.90)))
    de = rnd(max(0.05, dr / max(0.02, 1 - dr) * random.uniform(0.9, 1.1)))
    npm = rnd(noise_f(bnpm))
    roa = rnd(noise_f(broa))
    roe = rnd(noise_f(broe))
    at = rnd(max(0.1, noise_f(bat)))
    wcr = rnd(max(-0.3, min(0.6, (cr - 1) * 0.18)))
    # ic derivat din roa și dr
    ic = rnd(max(-8.0, roa / max(0.1, dr * 8)))
    return cr, qr, dr, de, npm, roa, roe, at, wcr, ic


# ── Construcție rânduri ──────────────────────────────────────────────────────
rows = []
HEADER = [
    "company_name", "year", "sector",
    "current_ratio", "quick_ratio", "debt_ratio",
    "debt_to_equity", "net_profit_margin", "return_on_assets", "return_on_equity",
    "asset_turnover", "working_capital_ratio", "interest_coverage", "is_bankrupt"
]

YEARS_ALL = list(range(2019, 2024))  # 2019-2023

# 1. Companii BVB listate
for company in BVB_COMPANIES:
    name, sector = company[0], company[1]
    n_years = random.randint(3, 5)
    years = sorted(random.sample(YEARS_ALL, n_years))
    for year in years:
        fin = gen_bvb_row(company, year)
        rows.append((name, year, sector) + fin + (0,))

# 2. Companii IMM sănătoase
for sector, names in IMM_COMPANIES.items():
    for name in names:
        n_years = random.randint(2, 5)
        years = sorted(random.sample(YEARS_ALL, n_years))
        for year in years:
            fin = gen_healthy(sector)
            rows.append((name, year, sector) + fin + (0,))

# 3. Companii falimentate
random.shuffle(BANKRUPT_NAMES)
for name in BANKRUPT_NAMES:
    n_years = random.randint(1, 3)
    years = sorted(random.sample(YEARS_ALL, n_years))
    for year in years:
        fin = gen_bankrupt()
        rows.append((name, year, "Diverse") + fin + (1,))

random.shuffle(rows)

# ── Scriere CSV ──────────────────────────────────────────────────────────────
w = csv.writer(sys.stdout, lineterminator="\n")
w.writerow(HEADER)
for row in rows:
    w.writerow(row)

# Info pe stderr
import sys as _sys
total = len(rows)
healthy = sum(1 for r in rows if r[-1] == 0)
bankrupt = sum(1 for r in rows if r[-1] == 1)
unique = len(set(r[0] for r in rows))
print(f"[INFO] Total rânduri: {total} | Unice companii: {unique} | Sănătoase: {healthy} | Falimentate: {bankrupt}", file=_sys.stderr)
