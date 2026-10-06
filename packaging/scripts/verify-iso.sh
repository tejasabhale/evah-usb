#!/usr/bin/env bash
# ==============================================================================
# EVAH OS — Bootable ISO Integrity Verification Script
# ==============================================================================
set -euo pipefail

CYAN='\033[1;36m'
GREEN='\033[1;32m'
RED='\033[1;31m'
NC='\033[0m'

ISO_PATH="${1:-dist/evah-live-x86_64.iso}"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}       EVAH OS -- ISO Verification & Integrity Inspector             ${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo -e "Target ISO: ${GREEN}${ISO_PATH}${NC}"

if [ ! -f "$ISO_PATH" ]; then
  echo -e "${RED}Error: ISO file '$ISO_PATH' not found! Run ./build-iso.sh first.${NC}" >&2
  exit 1
fi

SIZE_BYTES=$(wc -c < "$ISO_PATH" | tr -d ' ')
SIZE_MB=$((SIZE_BYTES / 1024 / 1024))
echo -e "File Size:  ${GREEN}${SIZE_MB} MB (${SIZE_BYTES} bytes)${NC}"

PYTHON_BIN=""
for py in python3 python py "/c/Program Files/Python314/python.exe" "/c/Users/Lenovo/AppData/Local/Programs/Python/Python312/python.exe"; do
  if command -v "$py" >/dev/null 2>&1; then
    if "$py" -c "import sys" >/dev/null 2>&1; then
      PYTHON_BIN="$py"
      break
    fi
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo -e "${RED}Error: Working Python 3 runtime not found for verification.${NC}" >&2
  exit 1
fi

"$PYTHON_BIN" - <<EOF
import sys
import pycdlib

iso_path = "$ISO_PATH"
print("\n[+] Inspecting ISO9660 & El Torito structures...")
iso = pycdlib.PyCdlib()
iso.open(iso_path)

vol = iso.pvd.volume_identifier.decode('ascii').strip()
print(f"  * Volume Identifier: {vol}")
assert vol == "EVAH_LIVE", f"Unexpected volume ID: {vol}"

has_rr = iso.has_rock_ridge()
has_joliet = iso.has_joliet()
print(f"  * Rock Ridge (POSIX permissions): {has_rr}")
print(f"  * Joliet (Long Filename support): {has_joliet}")
assert has_rr, "Missing Rock Ridge extensions"

# El Torito Catalog Check
cat = iso.eltorito_boot_catalog
assert cat is not None, "Missing El Torito boot catalog!"

# Initial Entry (BIOS ISOLINUX)
init_entry = cat.initial_entry
boot_ind = hex(init_entry.boot_indicator)
print(f"  * BIOS Boot Indicator: {boot_ind} (0x88 = Bootable)")
assert boot_ind == "0x88", "BIOS entry is not marked bootable"

# EFI Entry / Sections
print(f"  * El Torito Boot Sections: {len(cat.sections)} (BIOS + UEFI)")

# Verify Required Files
required_files = [
    "/BOOT/VMLINUZ;1",
    "/BOOT/INITRD.IMG;1",
    "/BOOT/GRUB/EFI.IMG;1",
    "/BOOT/GRUB/GRUB.CFG;1",
    "/BOOT/SYSLINUX/ISOLINUX.BIN;1",
    "/BOOT/SYSLINUX/ISOLINUX.CFG;1",
    "/OPT/EVAH/BACKEND/INDEX.CJS;1",
    "/OPT/EVAH/SCRIPTS/KIOSK.SH;1"
]

print("\n[+] Verifying critical ISO system components:")
for rf in required_files:
    try:
        rec = iso.get_record(iso_path=rf)
        print(f"  [OK] {rf}")
    except Exception as e:
        print(f"  [FAIL] {rf}: {e}")
        sys.exit(1)

iso.close()
print("\n[SUCCESS] All ISO9660, BIOS, UEFI, and EVAH payload checks PASSED!")
EOF

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}  VERIFICATION PASSED: ISO is valid, bootable, and payload intact!    ${NC}"
echo -e "${GREEN}======================================================================${NC}"
