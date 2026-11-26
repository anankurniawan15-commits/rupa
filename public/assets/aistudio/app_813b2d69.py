import os
import json
import streamlit as st

from rupa_ai.ai_features import (
    ai_sortir,
    generate_listing
)

from rupa_ai.config import MATERIAL_CATEGORIES


# ==========================================================
# 1. KONFIGURASI HALAMAN
# ==========================================================

st.set_page_config(
    page_title="RUPA AI",
    page_icon="♻️",
    layout="wide"
)

st.title("♻️ RUPA AI")
st.caption(
    "AI Sortir Barang dan AI Listing untuk mendukung "
    "pemanfaatan kembali barang."
)


# ==========================================================
# 2. MENU UTAMA
# ==========================================================

menu = st.sidebar.radio(
    "Menu",
    [
        "AI Sortir Barang",
        "AI Listing"
    ]
)


# ==========================================================
# 3. AI SORTIR BARANG
# ==========================================================

if menu == "AI Sortir Barang":

    st.header("AI Sortir Barang")

    st.write(
        "Identifikasi perkiraan material dan kondisi "
        "barang melalui gambar atau deskripsi."
    )

    input_method = st.radio(
        "Pilih metode input:",
        [
            "Unggah Gambar",
            "Deskripsi Barang"
        ],
        horizontal=True
    )

    image_path = None
    description = None

    if input_method == "Unggah Gambar":

        uploaded_file = st.file_uploader(
            "Unggah foto barang",
            type=["jpg", "jpeg", "png", "webp"]
        )

        if uploaded_file:

            os.makedirs("data/uploads", exist_ok=True)

            image_path = os.path.join(
                "data/uploads",
                uploaded_file.name
            )

            with open(image_path, "wb") as file:
                file.write(uploaded_file.getbuffer())

            st.image(
                uploaded_file,
                caption="Foto barang yang diunggah",
                width=350
            )

    else:

        description = st.text_area(
            "Deskripsikan barang:",
            placeholder=(
                "Contoh: Botol plastik bekas air mineral, "
                "kondisinya masih utuh tetapi sudah kosong."
            )
        )

    if st.button(
        "Analisis Barang",
        type="primary"
    ):

        if not image_path and not description:

            st.warning(
                "Masukkan gambar atau deskripsi barang terlebih dahulu."
            )

        else:

            try:

                with st.spinner(
                    "AI sedang menganalisis barang..."
                ):

                    result = ai_sortir(
                        image_path=image_path,
                        description=description
                    )

                st.session_state["sortir_result"] = result

            except Exception as error:

                st.error(
                    f"Analisis gagal: {error}"
                )

    # ------------------------------------------------------
    # HASIL ANALISIS
    # ------------------------------------------------------

    if "sortir_result" in st.session_state:

        result = st.session_state["sortir_result"]

        st.divider()
        st.subheader("Hasil Identifikasi")

        col1, col2 = st.columns(2)

        with col1:

            st.write("**Nama Barang**")

            st.write(
                result.get("item_name", "-")
            )

            st.write("**Perkiraan Material**")

            st.write(
                result.get("material", "-")
            )

            st.write("**Detail Material**")

            st.write(
                result.get("material_details", "-")
            )

        with col2:

            st.write("**Kondisi Barang**")

            st.write(
                result.get("condition", "-")
            )

            st.write("**Tindakan yang Disarankan**")

            st.write(
                result.get("recommended_action", "-")
            )

        # --------------------------------------------------
        # KOREKSI MATERIAL MANUAL
        # --------------------------------------------------

        st.subheader("Verifikasi Material")

        current_material = result.get("material")

        if current_material not in MATERIAL_CATEGORIES:
            current_material = "Tidak Diketahui"

        selected_material = st.selectbox(
            "Pilih atau koreksi material:",
            MATERIAL_CATEGORIES,
            index=MATERIAL_CATEGORIES.index(
                current_material
            )
        )

        if st.button("Simpan Koreksi Material"):

            result["material"] = selected_material

            result["verification_required"] = False

            result["references"] = []

            st.session_state["sortir_result"] = result

            st.success(
                "Material berhasil diperbarui."
            )

            st.rerun()

        # --------------------------------------------------
        # PENGAMATAN VISUAL
        # --------------------------------------------------

        st.subheader("Pengamatan Visual")

        observations = result.get(
            "visual_observations",
            []
        )

        if observations:

            for observation in observations:
                st.write(f"- {observation}")

        else:

            st.write("Tidak ada pengamatan tambahan.")

        # --------------------------------------------------
        # PERINGATAN KEAMANAN
        # --------------------------------------------------

        st.subheader("Peringatan Keamanan")

        warnings = (
            result.get("warnings", [])
            + [
                item["message"]
                for item in result.get(
                    "safety_warnings",
                    []
                )
            ]
        )

        if warnings:

            for warning in warnings:
                st.warning(str(warning))

        else:

            st.info(
                "Tidak ada peringatan khusus yang terdeteksi. "
                "Tetap periksa barang secara langsung."
            )

        # --------------------------------------------------
        # IDE UPCYCLE
        # --------------------------------------------------

        st.subheader("Rekomendasi Ide Upcycle")

        ideas = result.get("upcycle_ideas", [])

        if ideas:

            for index, idea in enumerate(ideas, start=1):

                with st.expander(
                    f"Ide {index}: {idea.get('idea', '-')}"
                ):

                    st.write(
                        idea.get("description", "-")
                    )

        else:

            st.info(
                "Belum ada rekomendasi ide upcycle."
            )

        # --------------------------------------------------
        # REFERENSI
        # --------------------------------------------------

        st.subheader("Referensi Terkait")

        references = result.get("references", [])

        if references:

            for reference in references:

                st.markdown(
                    f"**{reference.get('title') or 'Referensi'}**"
                )

                st.caption(
                    f"Sumber: {reference.get('source')}"
                )

                if reference.get("description"):
                    st.write(reference["description"])

                if reference.get("url"):
                    st.markdown(
                        f"[Lihat sumber]({reference['url']})"
                    )

                st.divider()

        else:

            st.info(
                "Belum ditemukan referensi dengan material yang sesuai."
            )

        # --------------------------------------------------
        # KATA KUNCI PENCARIAN
        # --------------------------------------------------

        st.subheader("Kata Kunci Pencarian")

        keywords = result.get("search_keywords", [])

        if keywords:
            st.write(", ".join(keywords))

        # --------------------------------------------------
        # LANJUT KE LISTING
        # --------------------------------------------------

        st.divider()

        if st.button("Gunakan Hasil untuk AI Listing"):

            st.session_state["listing_input"] = {
                "item_name": result.get("item_name", ""),
                "material": result.get("material", ""),
                "condition": result.get("condition", ""),
                "description": result.get(
                    "material_details",
                    ""
                )
            }

            st.success(
                "Data barang siap digunakan pada AI Listing. "
                "Silakan buka menu AI Listing."
            )


# ==========================================================
# 4. AI LISTING
# ==========================================================

elif menu == "AI Listing":

    st.header("AI Listing")

    st.write(
        "Buat draft listing barang secara otomatis "
        "berdasarkan informasi barang."
    )

    listing_input = st.session_state.get(
        "listing_input",
        {}
    )

    item_name = st.text_input(
        "Nama Barang",
        value=listing_input.get("item_name", "")
    )

    material = st.selectbox(
        "Material",
        MATERIAL_CATEGORIES,
        index=(
            MATERIAL_CATEGORIES.index(
                listing_input["material"]
            )
            if listing_input.get("material")
            in MATERIAL_CATEGORIES
            else 0
        )
    )

    condition = st.text_input(
        "Kondisi Barang",
        value=listing_input.get("condition", "")
    )

    item_description = st.text_area(
        "Deskripsi Barang",
        value=listing_input.get("description", "")
    )

    if st.button(
        "Buat Draft Listing",
        type="primary"
    ):

        if not item_name or not item_description:

            st.warning(
                "Nama dan deskripsi barang harus diisi."
            )

        else:

            try:

                with st.spinner(
                    "AI sedang membuat draft listing..."
                ):

                    result = generate_listing(
                        item_name,
                        material,
                        condition,
                        item_description
                    )

                st.session_state["listing_result"] = result

            except Exception as error:

                st.error(
                    f"Gagal membuat listing: {error}"
                )

    # ------------------------------------------------------
    # HASIL LISTING YANG BISA DIEDIT
    # ------------------------------------------------------

    if "listing_result" in st.session_state:

        result = st.session_state["listing_result"]

        st.divider()

        st.subheader("Hasil Draft Listing")

        edited_title = st.text_input(
            "Judul Listing",
            value=result.get("title", "")
        )

        edited_category = st.text_input(
            "Kategori",
            value=result.get("category", "")
        )

        edited_description = st.text_area(
            "Deskripsi Listing",
            value=result.get("description", ""),
            height=180
        )

        edited_tags = st.text_input(
            "Material Tags",
            value=", ".join(
                result.get("material_tags", [])
            )
        )

        edited_keywords = st.text_input(
            "Kata Kunci",
            value=", ".join(
                result.get("keywords", [])
            )
        )

        # --------------------------------------------------
        # PEMERIKSAAN KLAIM
        # --------------------------------------------------

        st.subheader("Pemeriksaan Klaim")

        risky_claims = result.get(
            "risky_claims",
            []
        )

        if risky_claims:

            st.warning(
                "Terdapat klaim yang perlu diperiksa:"
            )

            for claim in risky_claims:
                st.write(f"- {claim}")

        else:

            st.success(
                "Tidak ditemukan klaim berisiko berdasarkan "
                "daftar pemeriksaan otomatis."
            )

        # --------------------------------------------------
        # REFERENSI HARGA
        # --------------------------------------------------

        st.subheader("Referensi Harga")

        st.info(
            "Referensi harga belum tersedia. "
            "Sistem memerlukan minimal tiga listing pembanding "
            "yang valid dan memiliki informasi harga."
        )

        # --------------------------------------------------
        # PREVIEW
        # --------------------------------------------------

        st.divider()

        st.subheader("Preview Listing")

        st.markdown(f"### {edited_title}")

        st.write(f"**Kategori:** {edited_category}")

        st.write(
            f"**Material:** {edited_tags}"
        )

        st.write(edited_description)

        st.write(
            f"**Kata Kunci:** {edited_keywords}"
        )

        # --------------------------------------------------
        # SIMPAN HASIL
        # --------------------------------------------------

        if st.button("Simpan Draft Listing"):

            final_listing = {
                "title": edited_title,
                "category": edited_category,
                "description": edited_description,
                "material_tags": edited_tags.split(","),
                "keywords": edited_keywords.split(",")
            }

            os.makedirs(
                "data/processed",
                exist_ok=True
            )

            with open(
                "data/processed/listing_draft.json",
                "w",
                encoding="utf-8"
            ) as file:

                json.dump(
                    final_listing,
                    file,
                    indent=4,
                    ensure_ascii=False
                )

            st.success(
                "Draft listing berhasil disimpan."
            )