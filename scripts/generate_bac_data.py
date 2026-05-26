"""
Generate realistic Romanian BAC (Bacalaureat) exam data.
~15,000 rows covering years 2019-2024 across all Romanian counties.
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)

# All 41 Romanian counties + Bucharest (abbreviated)
JUDETE = [
    "Alba", "Arad", "Arges", "Bacau", "Bihor", "Bistrita-Nasaud",
    "Botosani", "Brasov", "Braila", "Buzau", "Caras-Severin", "Calarasi",
    "Cluj", "Constanta", "Covasna", "Dambovita", "Dolj", "Drobeta-Tr. Severin",
    "Galati", "Giurgiu", "Gorj", "Harghita", "Hunedoara", "Ialomita",
    "Iasi", "Ilfov", "Maramures", "Mehedinti", "Mures", "Neamt",
    "Olt", "Prahova", "Satu Mare", "Salaj", "Sibiu", "Suceava",
    "Teleorman", "Timis", "Tulcea", "Vaslui", "Valcea", "Vrancea",
    "Bucuresti"
]

# County pass-rate multipliers (some counties perform better)
COUNTY_PASS_RATE = {
    "Cluj": 0.82, "Timis": 0.80, "Brasov": 0.78, "Sibiu": 0.77,
    "Ilfov": 0.76, "Bucuresti": 0.75, "Hunedoara": 0.74, "Prahova": 0.73,
    "Constanta": 0.72, "Arad": 0.72, "Iasi": 0.71, "Mures": 0.70,
    "Alba": 0.70, "Bihor": 0.70, "Covasna": 0.69, "Harghita": 0.69,
    "Bistrita-Nasaud": 0.68, "Maramures": 0.68, "Satu Mare": 0.68,
    "Neamt": 0.67, "Suceava": 0.67, "Arges": 0.67, "Dambovita": 0.66,
    "Bacau": 0.65, "Galati": 0.65, "Valcea": 0.65, "Gorj": 0.64,
    "Dolj": 0.64, "Buzau": 0.64, "Salaj": 0.63, "Vrancea": 0.63,
    "Braila": 0.63, "Tulcea": 0.62, "Drobeta-Tr. Severin": 0.62,
    "Mehedinti": 0.62, "Botosani": 0.61, "Giurgiu": 0.61, "Olt": 0.61,
    "Caras-Severin": 0.60, "Ialomita": 0.60, "Calarasi": 0.59,
    "Teleorman": 0.58, "Vaslui": 0.57
}

PROFILES = ["Real", "Uman", "Tehnologic", "Pedagogic", "Sportiv"]
PROFILE_DIST = [0.30, 0.30, 0.25, 0.08, 0.07]

TIP_SCOALA = ["Liceu teoretic", "Liceu tehnic", "Colegiu national", "Grup scolar"]
TIP_SCOALA_DIST = [0.35, 0.25, 0.20, 0.20]
TIP_SCOALA_BONUS = {
    "Colegiu national": 0.12,
    "Liceu teoretic": 0.03,
    "Liceu tehnic": -0.03,
    "Grup scolar": -0.08,
}

SESIUNI = ["vara", "toamna"]
SESIUNE_DIST = [0.78, 0.22]
SESIUNE_BONUS = {"vara": 0.08, "toamna": -0.15}

ORAS_TIP = ["Urban", "Rural"]
URBAN_BONUS = 0.10

SEX = ["M", "F"]
SEX_PASS_BONUS = {"F": 0.04, "M": -0.04}

YEARS = [2019, 2020, 2021, 2022, 2023, 2024]
YEAR_STUDENTS = {
    2019: 2400, 2020: 2200, 2021: 2300, 2022: 2500, 2023: 2600, 2024: 2700
}
# 2020 COVID effect: slightly lower performance
COVID_PENALTY_2020 = -0.03


def clamp_grade(g):
    """Clamp grade to [1.00, 10.00] with 2 decimal places."""
    return round(float(np.clip(g, 1.0, 10.0)), 2)


def generate_grade(mean, std=1.2, absent_prob=0.03):
    """Generate a realistic grade with possible absence."""
    if np.random.random() < absent_prob:
        return np.nan
    g = np.random.normal(mean, std)
    return clamp_grade(g)


def compute_profile_grade_params(profile, tip_scoala, oras_tip, year):
    """Return grade means for each exam subject based on student profile."""
    base = 6.2
    if oras_tip == "Urban":
        base += 0.4
    if tip_scoala == "Colegiu national":
        base += 0.8
    elif tip_scoala == "Liceu tehnic":
        base -= 0.2
    elif tip_scoala == "Grup scolar":
        base -= 0.4
    if year == 2020:
        base += COVID_PENALTY_2020

    if profile == "Real":
        romana_mean = base + 0.1
        mate_mean = base + 0.3
        istorie_mean = None
        specialitate_mean = base + 0.2
    elif profile == "Uman":
        romana_mean = base + 0.4
        mate_mean = None
        istorie_mean = base + 0.3
        specialitate_mean = base + 0.1
    elif profile == "Tehnologic":
        romana_mean = base - 0.1
        mate_mean = base + 0.1
        istorie_mean = None
        specialitate_mean = base - 0.1
    elif profile == "Pedagogic":
        romana_mean = base + 0.3
        mate_mean = None
        istorie_mean = base + 0.2
        specialitate_mean = base + 0.2
    else:  # Sportiv
        romana_mean = base - 0.2
        mate_mean = None
        istorie_mean = base - 0.1
        specialitate_mean = base + 0.5  # sport specialty
    return romana_mean, mate_mean, istorie_mean, specialitate_mean


def compute_medie(nota_romana, nota_matematica, nota_istorie, nota_specialitate, nota_lb_moderna):
    """Compute weighted average (simplified Romanian BAC formula)."""
    grades = []
    weights = []

    if not np.isnan(nota_romana):
        grades.append(nota_romana)
        weights.append(1)
    else:
        return 0.0  # absent from mandatory subject = fail

    core = nota_matematica if not np.isnan(nota_matematica) else (nota_istorie if not np.isnan(nota_istorie) else None)
    if core is not None:
        grades.append(core)
        weights.append(1)
    else:
        return 0.0

    if not np.isnan(nota_specialitate):
        grades.append(nota_specialitate)
        weights.append(1)
    else:
        return 0.0

    if not np.isnan(nota_lb_moderna):
        grades.append(nota_lb_moderna)
        weights.append(0.5)

    if not grades:
        return 0.0

    medie = sum(g * w for g, w in zip(grades, weights)) / sum(weights)
    return round(float(np.clip(medie, 0, 10)), 2)


def is_promovat(nota_romana, nota_matematica, nota_istorie, nota_specialitate, nota_lb_moderna, medie):
    """Romanian BAC pass rules: every grade >= 5 AND average >= 6."""
    if medie < 6.0:
        return 0
    for g in [nota_romana, nota_matematica, nota_istorie, nota_specialitate]:
        if not np.isnan(g) and g < 5.0:
            return 0
    return 1


def generate_dataset(n_total=15000):
    rows = []

    # Distribute students across years
    year_counts = []
    for y in YEARS:
        year_counts.append(YEAR_STUDENTS[y])
    total_base = sum(year_counts)
    year_fracs = [c / total_base for c in year_counts]
    per_year = [int(n_total * f) for f in year_fracs]
    per_year[-1] += n_total - sum(per_year)  # fix rounding

    for yi, year in enumerate(YEARS):
        n = per_year[yi]

        judete_sample = np.random.choice(JUDETE, size=n, replace=True)
        profiles_sample = np.random.choice(PROFILES, size=n, p=PROFILE_DIST, replace=True)
        scoala_sample = np.random.choice(TIP_SCOALA, size=n, p=TIP_SCOALA_DIST, replace=True)
        sesiune_sample = np.random.choice(SESIUNI, size=n, p=SESIUNE_DIST, replace=True)
        sex_sample = np.random.choice(SEX, size=n, p=[0.47, 0.53], replace=True)
        # Urban/Rural: 65% urban nationally
        oras_tip_sample = np.random.choice(ORAS_TIP, size=n, p=[0.65, 0.35], replace=True)

        for i in range(n):
            judet = judete_sample[i]
            profile = profiles_sample[i]
            tip_scoala = scoala_sample[i]
            sesiune = sesiune_sample[i]
            sex = sex_sample[i]
            oras_tip = oras_tip_sample[i]

            romana_mean, mate_mean, istorie_mean, specialitate_mean = compute_profile_grade_params(
                profile, tip_scoala, oras_tip, year
            )

            # Absent probability: higher in rural, toamna, lower county
            base_absent = 0.04
            if oras_tip == "Rural":
                base_absent += 0.01
            if sesiune == "toamna":
                base_absent += 0.02

            nota_romana = generate_grade(romana_mean, absent_prob=base_absent)
            nota_matematica = np.nan
            nota_istorie = np.nan

            if profile in ["Real", "Tehnologic"]:
                nota_matematica = generate_grade(mate_mean, absent_prob=base_absent) if mate_mean else np.nan
            elif profile in ["Uman", "Pedagogic", "Sportiv"]:
                nota_istorie = generate_grade(istorie_mean, absent_prob=base_absent) if istorie_mean else np.nan

            nota_specialitate = generate_grade(specialitate_mean, absent_prob=base_absent)

            # Foreign language (optional, most students take it)
            lb_absent = 0.10
            nota_lb_moderna = generate_grade(romana_mean - 0.1, absent_prob=lb_absent)

            medie = compute_medie(nota_romana, nota_matematica, nota_istorie, nota_specialitate, nota_lb_moderna)
            promovat = is_promovat(nota_romana, nota_matematica, nota_istorie, nota_specialitate, nota_lb_moderna, medie)

            rows.append({
                "an": year,
                "judet": judet,
                "oras_tip": oras_tip,
                "sex": sex,
                "profil": profile,
                "nota_romana": nota_romana,
                "nota_matematica": nota_matematica,
                "nota_istorie": nota_istorie,
                "nota_specialitate": nota_specialitate,
                "nota_lb_moderna": nota_lb_moderna,
                "medie_generala": medie,
                "promovat": promovat,
                "sesiune": sesiune,
                "tip_scoala": tip_scoala,
            })

    df = pd.DataFrame(rows)
    return df


def adjust_pass_rates(df):
    """Post-process to adjust county-level pass rates to realistic values."""
    # We adjust by slightly scaling grades for each county so pass rates match targets
    # This is a soft adjustment - just add noise based on county quality
    county_quality = {}
    for j, rate in COUNTY_PASS_RATE.items():
        county_quality[j] = (rate - 0.65) * 2  # scale to [-0.16, 0.34]

    def adjust_row(row):
        quality = county_quality.get(row["judet"], 0)
        sesiune_adj = SESIUNE_BONUS.get(row["sesiune"], 0)
        sex_adj = SEX_PASS_BONUS.get(row["sex"], 0)
        adj = quality + sesiune_adj * 0.3 + sex_adj * 0.5

        for col in ["nota_romana", "nota_matematica", "nota_istorie", "nota_specialitate", "nota_lb_moderna"]:
            if not np.isnan(row[col]):
                row[col] = clamp_grade(row[col] + adj * np.random.uniform(0.5, 1.5))

        row["medie_generala"] = compute_medie(
            row["nota_romana"], row["nota_matematica"], row["nota_istorie"],
            row["nota_specialitate"], row["nota_lb_moderna"]
        )
        row["promovat"] = is_promovat(
            row["nota_romana"], row["nota_matematica"], row["nota_istorie"],
            row["nota_specialitate"], row["nota_lb_moderna"], row["medie_generala"]
        )
        return row

    df = df.apply(adjust_row, axis=1)
    return df


def main():
    output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "bac_romania.csv")

    print("Generating BAC Romania dataset (~15,000 rows)...")
    df = generate_dataset(n_total=15000)
    print(f"  Generated {len(df)} rows")

    print("Adjusting county pass rates...")
    df = adjust_pass_rates(df)

    overall_pass = df["promovat"].mean() * 100
    print(f"  Overall pass rate: {overall_pass:.1f}%")

    yearly = df.groupby("an")["promovat"].mean() * 100
    print("  Yearly pass rates:")
    for yr, rate in yearly.items():
        print(f"    {yr}: {rate:.1f}%")

    df.to_csv(output_path, index=False)
    print(f"\nSaved to: {output_path}")
    print(f"Shape: {df.shape}")
    print("\nColumn stats:")
    print(df.describe(include="all").T[["count", "mean", "std", "min", "max"]].to_string())


if __name__ == "__main__":
    main()
