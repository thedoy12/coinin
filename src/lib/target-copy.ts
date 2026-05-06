export function getTargetCopy(gameName: string, category?: string | null) {
  const text = `${gameName} ${category ?? ""}`.toLowerCase();
  if (/pln|token listrik|token/.test(text)) {
    return {
      label: "No. Meter / ID Pelanggan",
      placeholder: "Masukkan no. meter / ID pelanggan",
      instructions: "Pilih nominal token listrik lalu masukkan no. meter / ID pelanggan.",
      showZone: false,
    };
  }
  if (/pulsa|paket data|\bdata\b|by\.?u|axis|xl|telkomsel|indosat|tri|three|smartfren/.test(text)) {
    return {
      label: "Nomor Handphone",
      placeholder: "Masukkan nomor handphone tujuan",
      instructions: "Pilih nominal lalu masukkan nomor handphone tujuan.",
      showZone: false,
    };
  }
  if (/voucher|wallet|steam|garena|google play|alfamart|\bdana\b|go\s*pay|\bgopay\b|\bovo\b|shopee ?pay|e-money/.test(text)) {
    return {
      label: "Data Tujuan",
      placeholder: "Masukkan nomor HP / email / ID tujuan",
      instructions: "Pilih voucher lalu masukkan data tujuan sesuai instruksi produk.",
      showZone: false,
    };
  }
  return {
    label: "ID Pemain",
    placeholder: "Masukkan ID pemain",
    instructions: "Pilih nominal dan masukkan ID pemain untuk melakukan top-up.",
    showZone: true,
  };
}
