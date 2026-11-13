import React, { useState } from 'react';

/**
 * GujaratiVirtualKeyboard
 * Interactive on-screen Gujarati keyboard for easy Gujarati text entry
 * without needing special OS keyboard settings.
 *
 * Props:
 * - value: string (current input value)
 * - onChange: (newValue: string) => void
 * - inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
 * - onClose: () => void
 * - inline: boolean (if true, renders inline rather than popover floating card)
 */
export default function GujaratiVirtualKeyboard({
  value = '',
  onChange,
  inputRef,
  onClose,
  inline = false,
}) {
  const [activeTab, setActiveTab] = useState('consonants'); // 'consonants' | 'vowels' | 'numbers' | 'phrases'

  // Insert character or string at current cursor position
  const insertText = (char) => {
    const el = inputRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const updated = before + char + after;
      onChange(updated);

      setTimeout(() => {
        try {
          el.focus();
          const newPos = start + char.length;
          el.setSelectionRange(newPos, newPos);
        } catch {
          // ignore
        }
      }, 0);
    } else {
      onChange(value + char);
    }
  };

  // Backspace at current cursor position
  const handleBackspace = () => {
    const el = inputRef?.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start !== end) {
        const before = value.substring(0, start);
        const after = value.substring(end);
        onChange(before + after);
        setTimeout(() => {
          try {
            el.focus();
            el.setSelectionRange(start, start);
          } catch {}
        }, 0);
      } else if (start > 0) {
        // Use Array.from to correctly remove unicode character or matra
        const beforeSlice = value.substring(0, start);
        const chars = Array.from(beforeSlice);
        chars.pop();
        const newBefore = chars.join('');
        const after = value.substring(start);
        onChange(newBefore + after);
        setTimeout(() => {
          try {
            el.focus();
            el.setSelectionRange(newBefore.length, newBefore.length);
          } catch {}
        }, 0);
      }
    } else {
      const chars = Array.from(value);
      chars.pop();
      onChange(chars.join(''));
    }
  };

  const handleClear = () => {
    onChange('');
    if (inputRef?.current) {
      inputRef.current.focus();
    }
  };

  const consonants = [
    ['ક', 'ખ', 'ગ', 'ઘ', 'ઙ'],
    ['ચ', 'છ', 'જ', 'ઝ', 'ઞ'],
    ['ટ', 'ઠ', 'ડ', 'ઢ', 'ણ'],
    ['ત', 'થ', 'દ', 'ધ', 'ન'],
    ['પ', 'ફ', 'બ', 'ભ', 'મ'],
    ['ય', 'ર', 'લ', 'વ', 'શ'],
    ['ષ', 'સ', 'હ', 'ળ', 'ક્ષ'],
    ['જ્ઞ', 'ત્ર', 'શ્ર', 'દ્ર', 'ક્ર', 'પ્ર', 'દ્વ', 'દ્ધ'],
  ];

  const vowels = [
    'અ', 'આ', 'ઇ', 'ઈ', 'ઉ', 'ઊ', 'ઋ', 'એ', 'ઐ', 'ઓ', 'ઔ', 'અં', 'અઃ', 'ઍ', 'ઑ',
  ];

  const matras = [
    { label: 'ા (કા)', char: 'ા', desc: 'કાનો' },
    { label: 'િ (કિ)', char: 'િ', desc: 'હ્રસ્વ ઇ' },
    { label: 'ી (કી)', char: 'ી', desc: 'દીર્ઘ ઈ' },
    { label: 'ુ (કુ)', char: 'ુ', desc: 'હ્રસ્વ ઉ' },
    { label: 'ૂ (કૂ)', char: 'ૂ', desc: 'દીર્ઘ ઊ' },
    { label: 'ૃ (કૃ)', char: 'ૃ', desc: 'ઋ માત્રા' },
    { label: 'ે (કે)', char: 'ે', desc: 'એક માત્ર' },
    { label: 'ૈ (કૈ)', char: 'ૈ', desc: 'બે માત્ર' },
    { label: 'ો (કો)', char: 'ો', desc: 'કાનો એક માત્ર' },
    { label: 'ૌ (કૌ)', char: 'ૌ', desc: 'કાનો બે માત્ર' },
    { label: 'ં (કં)', char: 'ં', desc: 'અનુસ્વાર' },
    { label: 'ઃ (કઃ)', char: 'ઃ', desc: 'વિસર્ગ' },
    { label: '્ (ક્)', char: '્', desc: 'હલંત / અડધો અક્ષર' },
    { label: 'ૅ (કૅ)', char: 'ૅ', desc: 'ચંદ્ર ઍ' },
    { label: 'ૉ (કૉ)', char: 'ૉ', desc: 'કાનો ચંદ્ર ઑ' },
  ];

  const digitsGujarati = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  const digitsEnglish = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const symbols = ['।', '॥', '?', '!', ',', '.', '-', ':', ';', '(', ')', '"', "'", '%', '+', '=', '/', '—'];

  const quickPhrases = [
    {
      category: 'Discipline / શિસ્ત નોંધ',
      phrases: [
        'ગેરહાજર રહ્યા',
        'મોડા આવ્યા',
        'હોમવર્ક અધૂરું છે',
        'યુનિફોર્મ નિયમ મુજબ નથી',
        'વર્ગમાં વાતચીત કરે છે',
        'શિસ્તભંગ કર્યો',
        'પુસ્તક લાવ્યા નથી',
        'વાલી સંપર્ક જરૂરી છે',
        'ધ્યાન આપવાની જરૂર છે',
        'સારો સુધારો જોવા મળ્યો',
        'ખૂબ સરસ પ્રદર્શન',
      ],
    },
    {
      category: 'Questions & LT / પ્રશ્ન નોંધ',
      phrases: [
        'સમજાવો:',
        'વ્યાખ્યા આપો:',
        'તફાવત સ્પષ્ટ કરો:',
        'ટૂંકનોંધ લખો:',
        'કારણ આપો:',
        'ઉદાહરણ સાથે સમજાવો:',
        'સૂત્ર તારવો:',
        'આકૃતિ દોરી સમજાવો:',
        'સાબિત કરો કે',
        'દાખલો ગણો:',
      ],
    },
    {
      category: 'Notices / પરિપત્ર વાક્યો',
      phrases: [
        'તમામ વિદ્યાર્થીઓને જણાવવાનું કે',
        'આવતીકાલે શાળા બંધ રહેશે',
        'પરીક્ષા સમયપત્રક મુજબ',
        'વાલી મિટિંગનું આયોજન',
        'ફી ભરવા બાબત',
        'સાંસ્કૃતિક કાર્યક્રમ બાબત',
        'પ્રયોગશાળા કાર્ય બાબત',
      ],
    },
  ];

  return (
    <div
      className="gujarati-keyboard-card"
      style={{
        background: '#ffffff',
        border: '1px solid #CBD5E1',
        borderRadius: 12,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: 12,
        marginTop: 8,
        marginBottom: 8,
        maxWidth: 620,
        width: '100%',
        zIndex: 50,
        position: inline ? 'relative' : 'relative',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        // Prevent stealing focus from the input element
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      {/* Header with Title and Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⌨️</span>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0F2942' }}>
            ગુજરાતી કીબોર્ડ (Gujarati Keyboard)
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 6,
              width: 26,
              height: 26,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close Keyboard"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {[
          { id: 'consonants', label: 'વ્યંજન (Consonants)' },
          { id: 'vowels', label: 'સ્વર અને માત્રા (Vowels & Matras)' },
          { id: 'numbers', label: 'અંકો અને ચિહ્નો (Numbers & Symbols)' },
          { id: 'phrases', label: 'ઝડપી શબ્દો (Quick Phrases)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: 6,
              border: activeTab === tab.id ? '1px solid #0284C7' : '1px solid #E2E8F0',
              background: activeTab === tab.id ? '#E0F2FE' : '#F8FAFC',
              color: activeTab === tab.id ? '#0369A1' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Consonants */}
      {activeTab === 'consonants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {consonants.map((row, rIdx) => (
            <div key={rIdx} style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
              {row.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertText(char)}
                  style={{
                    minWidth: char.length > 1 ? 40 : 36,
                    height: 36,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F2942',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 6px',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                >
                  {char}
                </button>
              ))}
            </div>
          ))}

          {/* Quick Matras Mini-Row right under consonants for ultra fast access */}
          <div style={{ marginTop: 4, paddingTop: 6, borderTop: '1px dashed #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginRight: 4 }}>માત્રા:</span>
            {['ા', 'િ', 'ી', 'ુ', 'ૂ', 'ૃ', 'ે', 'ૈ', 'ો', 'ૌ', 'ં', '્', 'ઃ', 'ઍ', 'ઑ'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => insertText(m)}
                title={`માત્રા ${m}`}
                style={{
                  minWidth: 30,
                  height: 30,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: '1px solid #BFDBFE',
                  background: '#F0F9FF',
                  color: '#0369A1',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Vowels & Matras */}
      {activeTab === 'vowels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Independent Vowels */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              મુખ્ય સ્વર (Independent Vowels):
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {vowels.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertText(v)}
                  style={{
                    minWidth: 36,
                    height: 36,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F2942',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Combining Matras with preview */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              માત્રાઓ (Combining Signs - પહેલા અક્ષર લખીને માત્રા લગાવો):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
              {matras.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => insertText(m.char)}
                  title={m.desc}
                  style={{
                    padding: '6px 8px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #BFDBFE',
                    background: '#F8FAFC',
                    color: '#0369A1',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#E0F2FE'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{m.label}</span>
                  <span style={{ fontSize: 10, color: '#64748B' }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Numbers & Symbols */}
      {activeTab === 'numbers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Gujarati Digits */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              ગુજરાતી અંકો (Gujarati Numerals ૦–૯):
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {digitsGujarati.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => insertText(d)}
                  style={{
                    minWidth: 38,
                    height: 38,
                    fontSize: 17,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F2942',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* English Digits */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              અંગ્રેજી અંકો (English Numbers 0–9):
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {digitsEnglish.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => insertText(d)}
                  style={{
                    minWidth: 38,
                    height: 38,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#1E293B',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Punctuation & Symbols */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              વિરામચિહ્નો અને પ્રતીકો (Punctuation &amp; Symbols):
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => insertText(s)}
                  style={{
                    minWidth: 36,
                    height: 36,
                    fontSize: 15,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F2942',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Quick Phrases */}
      {activeTab === 'phrases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
          {quickPhrases.map((sec) => (
            <div key={sec.category}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                {sec.category}:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sec.phrases.map((phrase) => (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => insertText(phrase + ' ')}
                    style={{
                      padding: '5px 10px',
                      fontSize: 12.5,
                      fontWeight: 500,
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#0F2942',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  >
                    + {phrase}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Controls: Space, Backspace, Clear */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => insertText(' ')}
          style={{
            flex: '2 1 120px',
            height: 36,
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 6,
            border: '1px solid #CBD5E1',
            background: '#F8FAFC',
            color: '#1E293B',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
        >
          <span>␣</span> જગ્યા (Space)
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          style={{
            flex: '1 1 80px',
            height: 36,
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 6,
            border: '1px solid #FCA5A5',
            background: '#FEF2F2',
            color: '#DC2626',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
          title="Backspace"
        >
          <span>⌫</span> કાઢી નાખો
        </button>

        <button
          type="button"
          onClick={handleClear}
          style={{
            height: 36,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            color: '#64748B',
            cursor: 'pointer',
          }}
          title="Clear all text"
        >
          સાફ (Clear)
        </button>
      </div>
    </div>
  );
}

