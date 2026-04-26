"use client";

import { useState, useEffect } from "react";

// Configurações por país: DDI, bandeira, nome, tamanho do código de área e do telefone
const countries = [
  { code: "55",  flag: "🇧🇷", name: "Brasil",      areaCodeLen: 2, phoneLen: 9,  areaLabel: "DDD", phonePlaceholder: "999999999" },
  { code: "1",   flag: "🇺🇸", name: "EUA/Canadá",   areaCodeLen: 3, phoneLen: 7,  areaLabel: "Area Code", phonePlaceholder: "5551234" },
  { code: "351", flag: "🇵🇹", name: "Portugal",     areaCodeLen: 0, phoneLen: 9,  areaLabel: "",    phonePlaceholder: "912345678" },
  { code: "54",  flag: "🇦🇷", name: "Argentina",    areaCodeLen: 3, phoneLen: 7,  areaLabel: "Cód. Área", phonePlaceholder: "1234567" },
  { code: "598", flag: "🇺🇾", name: "Uruguai",      areaCodeLen: 0, phoneLen: 8,  areaLabel: "",    phonePlaceholder: "99123456" },
  { code: "595", flag: "🇵🇾", name: "Paraguai",     areaCodeLen: 3, phoneLen: 6,  areaLabel: "Cód. Área", phonePlaceholder: "123456" },
  { code: "56",  flag: "🇨🇱", name: "Chile",        areaCodeLen: 0, phoneLen: 9,  areaLabel: "",    phonePlaceholder: "912345678" },
  { code: "57",  flag: "🇨🇴", name: "Colômbia",     areaCodeLen: 3, phoneLen: 7,  areaLabel: "Cód. Área", phonePlaceholder: "1234567" },
  { code: "39",  flag: "🇮🇹", name: "Itália",       areaCodeLen: 3, phoneLen: 7,  areaLabel: "Prefisso", phonePlaceholder: "1234567" },
  { code: "34",  flag: "🇪🇸", name: "Espanha",      areaCodeLen: 0, phoneLen: 9,  areaLabel: "",    phonePlaceholder: "612345678" },
  { code: "33",  flag: "🇫🇷", name: "França",       areaCodeLen: 0, phoneLen: 9,  areaLabel: "",    phonePlaceholder: "612345678" },
  { code: "49",  flag: "🇩🇪", name: "Alemanha",     areaCodeLen: 3, phoneLen: 8,  areaLabel: "Vorwahl", phonePlaceholder: "12345678" },
  { code: "44",  flag: "🇬🇧", name: "Reino Unido",  areaCodeLen: 4, phoneLen: 6,  areaLabel: "Area Code", phonePlaceholder: "123456" },
  { code: "81",  flag: "🇯🇵", name: "Japão",        areaCodeLen: 3, phoneLen: 7,  areaLabel: "市外局番", phonePlaceholder: "1234567" },
];

// Opção customizada
const CUSTOM_OPTION = { code: "custom", flag: "🌐", name: "Outro país...", areaCodeLen: 3, phoneLen: 10, areaLabel: "Cód. Área", phonePlaceholder: "1234567890" };

interface WhatsAppInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
}

export default function WhatsAppInput({ value, onChange }: WhatsAppInputProps) {
  const [selectedCountryCode, setSelectedCountryCode] = useState("55");
  const [customDDI, setCustomDDI] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [phone, setPhone] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Buscar config do país selecionado
  const getCountryConfig = () => {
    if (selectedCountryCode === "custom") return CUSTOM_OPTION;
    return countries.find(c => c.code === selectedCountryCode) || countries[0];
  };

  const config = getCountryConfig();
  const effectiveDDI = selectedCountryCode === "custom" ? customDDI : selectedCountryCode;

  // Inicializar a partir do value recebido (para clonagem)
  useEffect(() => {
    if (value && !initialized) {
      let remaining = value;
      // Tentar encontrar o país pelo DDI (do mais longo para o mais curto)
      const sortedCountries = [...countries].sort((a, b) => b.code.length - a.code.length);
      const matched = sortedCountries.find(c => remaining.startsWith(c.code));
      
      if (matched) {
        setSelectedCountryCode(matched.code);
        remaining = remaining.slice(matched.code.length);
        if (matched.areaCodeLen > 0 && remaining.length > matched.areaCodeLen) {
          setAreaCode(remaining.slice(0, matched.areaCodeLen));
          setPhone(remaining.slice(matched.areaCodeLen));
        } else {
          setPhone(remaining);
        }
      } else if (remaining.length > 0) {
        // DDI desconhecido: tentar extrair
        setSelectedCountryCode("custom");
        // Assumir DDI de 2-3 dígitos
        const possibleDDI = remaining.slice(0, 2);
        setCustomDDI(possibleDDI);
        setPhone(remaining.slice(2));
      }
      setInitialized(true);
    }
  }, []);

  // Notificar o pai sempre que algo mudar
  useEffect(() => {
    if (initialized || areaCode || phone) {
      const full = `${effectiveDDI}${areaCode}${phone}`;
      onChange(full);
    }
  }, [effectiveDDI, areaCode, phone]);

  const handleAreaCodeChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, Math.max(config.areaCodeLen, 4));
    setAreaCode(cleaned);
  };

  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, Math.max(config.phoneLen, 10));
    setPhone(cleaned);
  };

  const handleCustomDDIChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    setCustomDDI(cleaned);
  };

  const handleCountryChange = (val: string) => {
    setSelectedCountryCode(val);
    setAreaCode("");
    setPhone("");
    if (val !== "custom") setCustomDDI("");
  };

  const minPhoneLen = Math.max(config.phoneLen - 1, 6);
  const totalDigits = areaCode.length + phone.length;
  const expectedTotal = config.areaCodeLen + config.phoneLen;
  const isComplete = phone.length >= minPhoneLen && (config.areaCodeLen === 0 || areaCode.length === config.areaCodeLen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'stretch' }}>
        
        {/* DDI - Código do País */}
        <div style={{ position: 'relative', minWidth: selectedCountryCode === "custom" ? '80px' : '105px', flexShrink: 0 }}>
          <select
            value={selectedCountryCode}
            onChange={e => handleCountryChange(e.target.value)}
            className="input-field"
            style={{
              padding: '0.8rem 0.4rem',
              fontSize: '0.9rem',
              appearance: 'none',
              cursor: 'pointer',
              paddingRight: '1.2rem',
              height: '100%',
            }}
          >
            {countries.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag} +{c.code}
              </option>
            ))}
            <option value="custom">{CUSTOM_OPTION.flag} Outro</option>
          </select>
          <div style={{
            position: 'absolute', right: '6px', top: '50%',
            transform: 'translateY(-50%)', pointerEvents: 'none',
            fontSize: '0.6rem', opacity: 0.4,
          }}>▼</div>
        </div>

        {/* DDI customizado (visível somente quando "Outro" é selecionado) */}
        {selectedCountryCode === "custom" && (
          <input
            type="text"
            inputMode="numeric"
            value={customDDI}
            onChange={e => handleCustomDDIChange(e.target.value)}
            placeholder="DDI"
            maxLength={4}
            className="input-field"
            style={{
              width: '60px', flexShrink: 0,
              padding: '0.8rem 0.4rem',
              fontSize: '0.9rem', textAlign: 'center',
            }}
          />
        )}

        {/* Código de Área / DDD (oculto para países sem código de área) */}
        {config.areaCodeLen > 0 && (
          <input
            type="text"
            inputMode="numeric"
            value={areaCode}
            onChange={e => handleAreaCodeChange(e.target.value)}
            placeholder={config.areaLabel || "Cód."}
            maxLength={Math.max(config.areaCodeLen, 4)}
            className="input-field"
            style={{
              width: config.areaCodeLen <= 2 ? '65px' : '80px',
              flexShrink: 0,
              padding: '0.8rem 0.4rem',
              fontSize: '0.9rem', textAlign: 'center',
              letterSpacing: '0.1em',
            }}
          />
        )}

        {/* Número do Telefone */}
        <div style={{ flex: 1, position: 'relative', minWidth: '120px' }}>
          <input
            type="text"
            inputMode="numeric"
            value={phone}
            onChange={e => handlePhoneChange(e.target.value)}
            placeholder={config.phonePlaceholder}
            maxLength={Math.max(config.phoneLen, 10)}
            className="input-field"
            style={{
              padding: '0.8rem',
              fontSize: '0.9rem',
              letterSpacing: '0.12em',
              width: '100%',
              height: '100%',
            }}
          />
          {phone.length > 0 && !isComplete && (
            <div style={{
              position: 'absolute', right: '8px', top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.65rem', color: '#f59e0b', fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              ⚠ incompleto
            </div>
          )}
          {isComplete && (
            <div style={{
              position: 'absolute', right: '8px', top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.85rem', color: '#10b981',
            }}>
              ✓
            </div>
          )}
        </div>
      </div>

      {/* Hint abaixo do campo */}
      <div style={{ fontSize: '0.75rem', opacity: 0.5, paddingLeft: '2px' }}>
        {selectedCountryCode === "custom" 
          ? `Digite o DDI do país + código de área + número`
          : `${config.flag} ${config.name}: +${config.code}${config.areaCodeLen > 0 ? ` (${config.areaLabel} ${config.areaCodeLen} dígitos)` : ''} + ${config.phoneLen} dígitos`
        }
      </div>
    </div>
  );
}
