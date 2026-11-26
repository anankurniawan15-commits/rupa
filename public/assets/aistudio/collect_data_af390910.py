import os
import re
import json
import sqlite3
import subprocess
import requests
import pandas as pd

from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin

from config import (
    KAGGLE_DATASETS,
    GITHUB_DATASETS,
    RAW_DIR,
    PROCESSED_DIR,
    DATABASE_PATH
)

# ==========================================================
# 1. PERSIAPAN FOLDER
# ==========================================================

for folder in [RAW_DIR, PROCESSED_DIR]:
    os.makedirs(folder, exist_ok=True)

os.makedirs("data", exist_ok=True)


# ==========================================================
# 2. FORMAT DATA SERAGAM
# ==========================================================

COMMON_FIELDS = [
    "source",
    "record_type",
    "title",
    "description",
    "material",
    "condition",
    "category",
    "image_path",
    "image_url",
    "source_url",
    "instructions",
    "tags",
    "raw_json"
]


def normalize_record(
    source,
    record_type,
    title=None,
    description=None,
    material=None,
    condition=None,
    category=None,
    image_path=None,
    image_url=None,
    source_url=None,
    instructions=None,
    tags=None,
    raw_json=None
):
    """
    Mengubah data dari berbagai sumber ke struktur
    yang sama agar bisa diproses oleh sistem RUPA.
    """

    return {
        "source": source,
        "record_type": record_type,
        "title": title,
        "description": description,
        "material": material,
        "condition": condition,
        "category": category,
        "image_path": image_path,
        "image_url": image_url,
        "source_url": source_url,
        "instructions": instructions,
        "tags": json.dumps(tags or [], ensure_ascii=False),
        "raw_json": json.dumps(
            raw_json or {},
            ensure_ascii=False,
            default=str
        )
    }


# ==========================================================
# 3. PEMETAAN LABEL MATERIAL
# ==========================================================

MATERIAL_MAPPING = {
    # Plastik
    "plastic": "Plastik",
    "plastics": "Plastik",
    "pet": "Plastik",
    "hdpe": "Plastik",
    "pvc": "Plastik",
    "polypropylene": "Plastik",

    # Kertas
    "paper": "Kertas",
    "cardboard": "Kertas",
    "carton": "Kertas",

    # Kaca
    "glass": "Kaca",

    # Logam
    "metal": "Logam",
    "aluminium": "Logam",
    "aluminum": "Logam",
    "steel": "Logam",
    "iron": "Logam",

    # Tekstil
    "textile": "Tekstil",
    "clothes": "Tekstil",
    "clothing": "Tekstil",
    "fabric": "Tekstil",
    "shoes": "Tekstil",

    # Kayu
    "wood": "Kayu",
    "wooden": "Kayu",

    # Karet
    "rubber": "Karet",

    # Lainnya
    "trash": "Lainnya/Campuran",
    "miscellaneous": "Lainnya/Campuran",
    "mixed": "Lainnya/Campuran"
}


def map_material(label):
    if not label:
        return None

    label = str(label).lower().strip()

    for keyword, material in MATERIAL_MAPPING.items():
        if keyword in label:
            return material

    return None


# ==========================================================
# 4. DOWNLOAD DATASET KAGGLE
# ==========================================================

def download_kaggle_datasets():
    """
    Membutuhkan Kaggle API credentials.
    Dataset disimpan di folder data/raw.
    """

    for dataset in KAGGLE_DATASETS:

        dataset_name = dataset.split("/")[-1]
        output_dir = os.path.join(RAW_DIR, dataset_name)

        os.makedirs(output_dir, exist_ok=True)

        command = [
            "kaggle",
            "datasets",
            "download",
            "-d",
            dataset,
            "-p",
            output_dir,
            "--unzip"
        ]

        print(f"\nMengunduh Kaggle: {dataset}")

        try:
            subprocess.run(command, check=True)
            print("Berhasil:", dataset_name)

        except FileNotFoundError:
            print("Kaggle CLI belum terpasang.")

        except subprocess.CalledProcessError as error:
            print("Gagal mengunduh:", dataset, error)


# ==========================================================
# 5. CLONE REPOSITORY GITHUB
# ==========================================================

def download_github_repositories():

    for name, repository in GITHUB_DATASETS.items():

        destination = os.path.join(RAW_DIR, name)

        if os.path.exists(destination):
            print(f"{name} sudah tersedia.")
            continue

        print(f"\nMengambil repository: {name}")

        try:
            subprocess.run(
                [
                    "git",
                    "clone",
                    "--depth",
                    "1",
                    repository,
                    destination
                ],
                check=True
            )

            print("Berhasil:", name)

        except Exception as error:
            print("Gagal:", name, error)


# ==========================================================
# 6. MEMBACA DATASET GAMBAR
# ==========================================================

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".webp", ".bmp"
}


def scan_image_dataset(dataset_name):
    """
    Membaca struktur folder dataset gambar.

    Nama folder digunakan sebagai label awal.
    Label tersebut kemudian dipetakan ke kategori
    material RUPA.
    """

    dataset_path = Path(RAW_DIR) / dataset_name

    if not dataset_path.exists():
        return []

    records = []

    for image_file in dataset_path.rglob("*"):

        if image_file.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        # Nama folder induk sebagai label dataset
        original_label = image_file.parent.name

        material = map_material(original_label)

        record = normalize_record(
            source=dataset_name,
            record_type="image_dataset",
            title=image_file.stem,
            material=material,
            category=original_label,
            image_path=str(image_file),
            source_url=None,
            raw_json={
                "original_label": original_label,
                "file_extension": image_file.suffix
            }
        )

        records.append(record)

    return records


# ==========================================================
# 7. ZENODO API
# ==========================================================

def collect_zenodo_data(
    query="waste recycling material",
    max_results=50
):

    url = "https://zenodo.org/api/records"

    params = {
        "q": query,
        "size": max_results
    }

    records = []

    try:
        response = requests.get(
            url,
            params=params,
            timeout=30
        )

        response.raise_for_status()

        results = response.json().get("hits", {}).get("hits", [])

        for item in results:

            metadata = item.get("metadata", {})

            title = metadata.get("title")
            description = metadata.get("description")
            doi = metadata.get("doi")

            record = normalize_record(
                source="Zenodo",
                record_type="research_reference",
                title=title,
                description=description,
                category="Research Dataset",
                source_url=(
                    f"https://doi.org/{doi}"
                    if doi else None
                ),
                tags=metadata.get("keywords", []),
                raw_json=item
            )

            records.append(record)

    except Exception as error:
        print("Zenodo error:", error)

    return records


# ==========================================================
# 8. OPEN PRODUCTS FACTS
# ==========================================================

def collect_open_products_facts(
    query="plastic packaging",
    max_results=50
):

    url = "https://world.openproductsfacts.org/cgi/search.pl"

    params = {
        "search_terms": query,
        "json": 1,
        "page_size": max_results
    }

    records = []

    try:
        response = requests.get(
            url,
            params=params,
            timeout=30,
            headers={
                "User-Agent": "RUPA-Research-App/1.0"
            }
        )

        response.raise_for_status()

        products = response.json().get("products", [])

        for product in products:

            product_name = product.get("product_name")
            packaging = product.get("packaging")
            categories = product.get("categories")

            record = normalize_record(
                source="Open Products Facts",
                record_type="product_reference",
                title=product_name,
                description=product.get("generic_name"),
                material=map_material(packaging),
                category=categories,
                image_url=product.get("image_url"),
                source_url=product.get("url"),
                tags=(
                    packaging.split(",")
                    if packaging else []
                ),
                raw_json=product
            )

            records.append(record)

    except Exception as error:
        print("Open Products Facts error:", error)

    return records


# ==========================================================
# 9. SCRAPING HALAMAN WEB PUBLIK
# ==========================================================

def scrape_public_page(url, source_name, record_type):
    """
    Mengambil metadata publik dari halaman web.

    Tidak mengunduh konten yang membutuhkan login,
    tidak melewati CAPTCHA, dan tidak mengambil
    konten yang dibatasi oleh pemilik situs.
    """

    records = []

    try:
        response = requests.get(
            url,
            timeout=30,
            headers={
                "User-Agent": "RUPA-Research-App/1.0"
            }
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        title_tag = soup.find("meta", property="og:title")
        description_tag = soup.find(
            "meta",
            property="og:description"
        )

        title = (
            title_tag.get("content")
            if title_tag else (
                soup.title.text.strip()
                if soup.title else None
            )
        )

        description = (
            description_tag.get("content")
            if description_tag else None
        )

        image_tag = soup.find("meta", property="og:image")

        image_url = None

        if image_tag:
            image_url = urljoin(
                url,
                image_tag.get("content", "")
            )

        record = normalize_record(
            source=source_name,
            record_type=record_type,
            title=title,
            description=description,
            image_url=image_url,
            source_url=url
        )

        records.append(record)

    except Exception as error:
        print(f"Scraping {source_name} gagal:", error)

    return records


# ==========================================================
# 10. ROBOFLOW
# ==========================================================

def download_roboflow_dataset(
    workspace,
    project,
    version,
    api_key,
    export_format="folder"
):
    """
    Download dilakukan setelah pengguna menentukan
    workspace, project, dan version yang dapat diakses.
    """

    try:
        from roboflow import Roboflow

        rf = Roboflow(api_key=api_key)

        project_object = rf.workspace(
            workspace
        ).project(project)

        dataset = project_object.version(
            version
        ).download(export_format)

        print("Dataset Roboflow berhasil diunduh.")

        return dataset.location

    except Exception as error:
        print("Roboflow error:", error)
        return None


# ==========================================================
# 11. DATABASE SQLITE
# ==========================================================

def save_to_database(records):

    if not records:
        print("Tidak ada data untuk disimpan.")
        return

    connection = sqlite3.connect(DATABASE_PATH)

    dataframe = pd.DataFrame(
        records,
        columns=COMMON_FIELDS
    )

    dataframe.to_sql(
        "rupa_data",
        connection,
        if_exists="append",
        index=False
    )

    connection.close()

    print(f"{len(records)} data berhasil disimpan.")


# ==========================================================
# 12. MENYIMPAN DATA HASIL NORMALISASI
# ==========================================================

def export_processed_data(records):

    if not records:
        return

    dataframe = pd.DataFrame(
        records,
        columns=COMMON_FIELDS
    )

    # Hapus duplikasi berdasarkan sumber dan lokasi data
    dataframe.drop_duplicates(
        subset=["source", "image_path", "source_url", "title"],
        inplace=True
    )

    csv_path = os.path.join(
        PROCESSED_DIR,
        "rupa_dataset.csv"
    )

    json_path = os.path.join(
        PROCESSED_DIR,
        "rupa_dataset.json"
    )

    dataframe.to_csv(
        csv_path,
        index=False,
        encoding="utf-8-sig"
    )

    dataframe.to_json(
        json_path,
        orient="records",
        indent=4,
        force_ascii=False
    )

    print("Data berhasil diekspor.")
    print("CSV:", csv_path)
    print("JSON:", json_path)


# ==========================================================
# 13. MENJALANKAN SELURUH PROSES
# ==========================================================

def main():

    all_records = []

    # A. Download dataset
    download_kaggle_datasets()
    download_github_repositories()

    # B. Baca dataset gambar
    dataset_names = [
        "realwaste",
        "garbage-classification-v2",
        "trashnet",
        "TACO",
        "DeepFashion2"
    ]

    for dataset_name in dataset_names:

        print(f"Membaca dataset: {dataset_name}")

        records = scan_image_dataset(dataset_name)

        all_records.extend(records)

    # C. Zenodo
    all_records.extend(
        collect_zenodo_data()
    )

    # D. Open Products Facts
    all_records.extend(
        collect_open_products_facts()
    )

    # E. Karya Nusantara
    all_records.extend(
        scrape_public_page(
            "https://karyanusantara.co.id/",
            "Karya Nusantara",
            "product_reference"
        )
    )

    # F. Instructables
    all_records.extend(
        scrape_public_page(
            "https://www.instructables.com/circuits/",
            "Instructables",
            "upcycle_reference"
        )
    )

    # G. Roboflow
    # Isi konfigurasi workspace/project/version
    # pada pemanggilan fungsi jika sudah dipilih.

    # H. Simpan hasil
    save_to_database(all_records)
    export_processed_data(all_records)

    print("\nProses pengumpulan data selesai.")
    print("Total data:", len(all_records))


if __name__ == "__main__":
    main()