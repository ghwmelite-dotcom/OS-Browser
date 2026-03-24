import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, KENTE, FONT_SIZE, rs, type ThemeColors } from '../constants/theme';
import { NetworkStatusWidget } from '../components/NetworkStatusWidget';

/* ------------------------------------------------------------------ */
/*  Types & Props                                                      */
/* ------------------------------------------------------------------ */

interface GovHubScreenProps {
  isDark: boolean;
  onOpenUrl: (url: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const GOV_PORTALS = [
  { id: 'ghana-gov', name: 'Ghana.gov', short: 'GG', url: 'https://ghana.gov.gh', category: 'General', color: '#D4A017' },
  { id: 'gifmis', name: 'GIFMIS', short: 'GF', url: 'https://gifmis.finance.gov.gh', category: 'Finance', color: '#006B3F' },
  { id: 'cagd', name: 'CAGD Payroll', short: 'CA', url: 'https://cagd.gov.gh', category: 'Finance', color: '#006B3F' },
  { id: 'gra', name: 'GRA Tax Portal', short: 'GR', url: 'https://gra.gov.gh', category: 'Tax', color: '#CE1126' },
  { id: 'ssnit', name: 'SSNIT', short: 'SS', url: 'https://ssnit.org.gh', category: 'Pensions', color: '#6366f1' },
  { id: 'ohcs', name: 'OHCS Platform', short: 'OH', url: 'https://ohcs.gov.gh', category: 'HR', color: '#D4A017' },
  { id: 'espar', name: 'E-SPAR Portal', short: 'ES', url: 'https://ohcsgh.web.app', category: 'HR', color: '#D4A017' },
  { id: 'psc', name: 'Public Services Commission', short: 'PS', url: 'https://psc.gov.gh', category: 'HR', color: '#D4A017' },
  { id: 'ghs', name: 'Ghana Health Service', short: 'GH', url: 'https://ghs.gov.gh', category: 'Health', color: '#10b981' },
  { id: 'nhia', name: 'NHIA', short: 'NH', url: 'https://nhis.gov.gh', category: 'Health', color: '#10b981' },
  { id: 'mof', name: 'Ministry of Finance', short: 'MF', url: 'https://mofep.gov.gh', category: 'Finance', color: '#006B3F' },
  { id: 'nia', name: 'NIA (GhanaCard)', short: 'NI', url: 'https://nia.gov.gh', category: 'Identity', color: '#D4A017' },
  { id: 'rgd', name: 'Registrar General', short: 'RG', url: 'https://rgd.gov.gh', category: 'Legal', color: '#6366f1' },
  { id: 'lc', name: 'Lands Commission', short: 'LC', url: 'https://lc.gov.gh', category: 'Land', color: '#4ade80' },
  { id: 'ecg', name: 'ECG', short: 'EC', url: 'https://ecg.com.gh', category: 'Utilities', color: '#0ea5e9' },
  { id: 'gwcl', name: 'GWCL', short: 'GW', url: 'https://gwcl.com.gh', category: 'Utilities', color: '#0ea5e9' },
  { id: 'bog', name: 'Bank of Ghana', short: 'BG', url: 'https://bog.gov.gh', category: 'Finance', color: '#006B3F' },
  { id: 'parliament', name: 'Parliament', short: 'PA', url: 'https://parliament.gh', category: 'General', color: '#D4A017' },
  { id: 'ppa', name: 'PPA', short: 'PP', url: 'https://ppa.gov.gh', category: 'Procurement', color: '#f97316' },
  { id: 'fda', name: 'FDA Ghana', short: 'FD', url: 'https://fdaghana.gov.gh', category: 'Health', color: '#10b981' },
];

const MOMO_PROVIDERS = [
  { id: 'mtn', name: 'MTN MoMo', ussd: '*170#', color: '#FFC300', textColor: '#000', desc: 'Send/receive money, pay bills, buy airtime', actions: ['Send Money', 'Buy Airtime', 'Pay Bills'] },
  { id: 'telecel', name: 'Telecel Cash', ussd: '*110#', color: '#E60000', textColor: '#fff', desc: 'Mobile wallet, transfers, merchant payments', actions: ['Send Money', 'Cash Out', 'Pay Bills'] },
  { id: 'at', name: 'AirtelTigo Money', ussd: '*500#', color: '#E40046', textColor: '#fff', desc: 'Cash-in/out, bill payments, international transfers', actions: ['Send Money', 'Buy Data', 'Pay Bills'] },
];

const EXCHANGE_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'GBP', name: 'British Pound', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'EUR', name: 'Euro', flag: '\u{1F1EA}\u{1F1FA}' },
  { code: 'NGN', name: 'Nigerian Naira', flag: '\u{1F1F3}\u{1F1EC}' },
  { code: 'XOF', name: 'CFA Franc', flag: '\u{1F1E8}\u{1F1EE}' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '\u{1F1E8}\u{1F1F3}' },
];

const USSD_CODES = [
  {
    network: 'MTN', color: '#FFC300',
    codes: [
      { code: '*170#', label: 'MoMo Menu' },
      { code: '*138#', label: 'Check Balance' },
      { code: '*566#', label: 'Data Bundles' },
      { code: '*170*1*1#', label: 'Send Money' },
      { code: '*5050#', label: 'MoMo Pay' },
    ],
  },
  {
    network: 'Telecel', color: '#E60000',
    codes: [
      { code: '*110#', label: 'Telecel Cash' },
      { code: '*137#', label: 'Check Balance' },
      { code: '*126#', label: 'Data Bundles' },
      { code: '*110*1*1#', label: 'Send Money' },
    ],
  },
  {
    network: 'AirtelTigo', color: '#E40046',
    codes: [
      { code: '*500#', label: 'AT Money' },
      { code: '*124#', label: 'Check Balance' },
      { code: '*141#', label: 'Data Bundles' },
      { code: '*500*1*1#', label: 'Send Money' },
    ],
  },
  {
    network: 'Services', color: '#D4A017',
    codes: [
      { code: '*920#', label: 'ECG Prepaid' },
      { code: '*713*1#', label: 'NHIS Status' },
      { code: '*711#', label: 'GRA Tax' },
      { code: '*455#', label: 'GhanaPostGPS' },
      { code: '*222#', label: 'SSNIT' },
    ],
  },
];

const GOVPLAY_GAMES = [
  { id: 'oware', name: 'Oware', emoji: '\u{1F3FA}', color: '#D4A017' },
  { id: 'chess', name: 'Chess', emoji: '\u265F\uFE0F', color: '#6366f1' },
  { id: 'checkers', name: 'Checkers', emoji: '\u{1F534}', color: '#EF4444' },
  { id: 'ludo', name: 'Ludo', emoji: '\u{1F3B2}', color: '#3B82F6' },
  { id: 'sudoku', name: 'Sudoku', emoji: '\u{1F522}', color: '#10B981' },
  { id: 'minesweeper', name: 'Mines', emoji: '\u{1F4A3}', color: '#64748b' },
  { id: 'solitaire', name: 'Solitaire', emoji: '\u{1F0CF}', color: '#22c55e' },
  { id: '2048', name: '2048', emoji: '\u{1F9EE}', color: '#F97316' },
  { id: 'snake', name: 'Snake', emoji: '\u{1F40D}', color: '#84cc16' },
  { id: 'word-scramble', name: 'Words', emoji: '\u{1F524}', color: '#a855f7' },
  { id: 'trivia', name: 'Trivia', emoji: '\u{1F1EC}\u{1F1ED}', color: '#006B3F' },
  { id: 'typing', name: 'Typing', emoji: '\u2328\uFE0F', color: '#0ea5e9' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const EXCHANGE_API = 'https://open.er-api.com/v6/latest/USD';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GovHubScreen({ isDark, onOpenUrl }: GovHubScreenProps) {
  const insets = useSafeAreaInsets();
  const theme: ThemeColors = isDark ? COLORS.dark : COLORS.light;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [convertAmount, setConvertAmount] = useState('1');
  const [convertCurrency, setConvertCurrency] = useState('USD');

  // Fetch exchange rates
  useEffect(() => {
    fetch(EXCHANGE_API)
      .then(r => r.json())
      .then(data => {
        if (data?.rates) setExchangeRates(data.rates);
      })
      .catch(() => {});
  }, []);

  const ghsRate = exchangeRates['GHS'] && exchangeRates[convertCurrency]
    ? (parseFloat(convertAmount || '0') * (exchangeRates['GHS'] / exchangeRates[convertCurrency]))
    : 0;

  // Filter portals by search
  const filteredPortals = searchQuery.trim()
    ? GOV_PORTALS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : GOV_PORTALS;

  const dialUSSD = useCallback((code: string) => {
    Linking.openURL(`tel:${encodeURIComponent(code)}`).catch(() => {});
  }, []);

  /* ---- Section header ---- */
  const SectionHeader = ({ icon, title, color, count }: { icon: string; title: string; color: string; count?: number }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: color + '18', borderColor: color + '33' }]}>
          <Text style={[styles.countText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#006B3F', paddingTop: insets.top + 8 }]}>
        {/* Flag stripe */}
        <View style={styles.flagStripe}>
          <View style={[styles.flagBar, { backgroundColor: KENTE.red }]} />
          <View style={[styles.flagBar, { backgroundColor: KENTE.gold }]} />
          <View style={[styles.flagBar, { backgroundColor: KENTE.green }]} />
        </View>

        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="business" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Government Hub</Text>
            <Text style={styles.headerSubtitle}>{GOV_PORTALS.length} services + MoMo, Rates & USSD</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Network Status & Data Usage ── */}
        <NetworkStatusWidget isDark={isDark} />

        {/* ── Government Portals ── */}
        <SectionHeader icon="business-outline" title="Government Portals" color="#006B3F" count={filteredPortals.length} />
        <View style={styles.portalGrid}>
          {filteredPortals.map(portal => (
            <TouchableOpacity
              key={portal.id}
              style={[styles.portalCard, { backgroundColor: theme.surface1 }]}
              onPress={() => onOpenUrl(portal.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.portalIcon, { backgroundColor: portal.color + '18' }]}>
                <Text style={[styles.portalIconText, { color: portal.color }]}>{portal.short}</Text>
              </View>
              <Text style={[styles.portalName, { color: theme.text }]} numberOfLines={1}>{portal.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: portal.color + '12', borderColor: portal.color + '33' }]}>
                <Text style={[styles.categoryText, { color: portal.color }]}>{portal.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Mobile Money ── */}
        <SectionHeader icon="phone-portrait-outline" title="Mobile Money" color="#FFC300" />
        {MOMO_PROVIDERS.map(provider => (
          <TouchableOpacity
            key={provider.id}
            style={[styles.momoCard, { backgroundColor: theme.surface1 }]}
            onPress={() => dialUSSD(provider.ussd)}
            activeOpacity={0.7}
          >
            <View style={[styles.momoIconBox, { backgroundColor: provider.color }]}>
              <Ionicons name="wallet" size={20} color={provider.textColor} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.momoHeader}>
                <Text style={[styles.momoName, { color: theme.text }]}>{provider.name}</Text>
                <Text style={[styles.momoUssd, { color: theme.textMuted }]}>{provider.ussd}</Text>
              </View>
              <Text style={[styles.momoDesc, { color: theme.textMuted }]}>{provider.desc}</Text>
              <View style={styles.momoActions}>
                {provider.actions.map(action => (
                  <View key={action} style={[styles.momoActionTag, { backgroundColor: provider.color + '15', borderColor: provider.color + '33' }]}>
                    <Text style={[styles.momoActionText, { color: provider.color === '#FFC300' ? '#B8860B' : provider.color }]}>{action}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── Cedi Exchange Rates ── */}
        <SectionHeader icon="swap-horizontal" title="Cedi Exchange Rates" color="#006B3F" />
        <View style={styles.rateGrid}>
          {EXCHANGE_CURRENCIES.map(cur => {
            const rate = exchangeRates['GHS'] && exchangeRates[cur.code]
              ? (exchangeRates['GHS'] / exchangeRates[cur.code])
              : null;
            return (
              <View key={cur.code} style={[styles.rateCard, { backgroundColor: theme.surface1 }]}>
                <Text style={styles.rateFlag}>{cur.flag}</Text>
                <Text style={[styles.rateCode, { color: theme.text }]}>{cur.code}</Text>
                <Text style={[styles.rateValue, { color: KENTE.gold }]}>
                  {rate ? `GHS ${rate.toFixed(2)}` : '...'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Mini converter */}
        <View style={[styles.converterBox, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
          <TextInput
            style={[styles.converterInput, { backgroundColor: theme.surface2, color: theme.text, borderColor: theme.border }]}
            value={convertAmount}
            onChangeText={setConvertAmount}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={theme.textMuted}
          />
          <View style={styles.converterCurrencies}>
            {['USD', 'GBP', 'EUR'].map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.converterPill,
                  {
                    backgroundColor: convertCurrency === c ? KENTE.gold + '20' : theme.surface2,
                    borderColor: convertCurrency === c ? KENTE.gold : theme.border,
                  },
                ]}
                onPress={() => setConvertCurrency(c)}
              >
                <Text style={{ fontSize: rs(15), fontWeight: '700', color: convertCurrency === c ? KENTE.gold : theme.textMuted }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
          <View style={[styles.converterResult, { backgroundColor: KENTE.gold + '12', borderColor: KENTE.gold + '33' }]}>
            <Text style={[styles.converterResultText, { color: KENTE.gold }]}>
              GHS {ghsRate ? ghsRate.toFixed(2) : '—'}
            </Text>
          </View>
        </View>

        {/* ── GovPlay Games ── */}
        <SectionHeader icon="game-controller-outline" title="GovPlay Games" color="#FF4081" count={GOVPLAY_GAMES.length} />
        <Text style={[styles.comingSoonNote, { color: theme.textMuted }]}>
          Games are available on the desktop version. Mobile games coming soon!
        </Text>
        <View style={styles.gameGrid}>
          {GOVPLAY_GAMES.map(game => (
            <View key={game.id} style={[styles.gameCard, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
              <Text style={styles.gameEmoji}>{game.emoji}</Text>
              <Text style={[styles.gameName, { color: theme.text }]}>{game.name}</Text>
            </View>
          ))}
        </View>

        {/* ── USSD Quick Codes ── */}
        <SectionHeader icon="keypad-outline" title="USSD Quick Codes" color="#0891B2" />
        <Text style={[styles.ussdHint, { color: theme.textMuted }]}>
          Tap any code to dial it directly
        </Text>
        {USSD_CODES.map(cat => (
          <View key={cat.network} style={[styles.ussdCard, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
            {/* Network color accent */}
            <View style={[styles.ussdAccent, { backgroundColor: cat.color }]} />

            <View style={styles.ussdNetworkRow}>
              <View style={[styles.ussdNetworkBadge, { backgroundColor: cat.color + '1a', borderColor: cat.color + '33' }]}>
                <Text style={[styles.ussdNetworkCode, { color: cat.color }]}>{cat.network.slice(0, 2)}</Text>
              </View>
              <Text style={[styles.ussdNetworkName, { color: theme.text }]}>{cat.network}</Text>
            </View>

            {cat.codes.map(code => (
              <TouchableOpacity
                key={code.code}
                style={[styles.ussdCodeRow, { backgroundColor: theme.surface2 }]}
                onPress={() => dialUSSD(code.code)}
                activeOpacity={0.6}
              >
                <Text style={[styles.ussdCode, { color: theme.text }]}>{code.code}</Text>
                <Text style={[styles.ussdLabel, { color: theme.textMuted }]}>{code.label}</Text>
                <Ionicons name="call-outline" size={14} color={cat.color} />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  flex: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  flagStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    flexDirection: 'row',
  },
  flagBar: { flex: 1, height: 3 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: rs(14), color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: rs(16),
    color: '#fff',
    height: 40,
    paddingVertical: 0,
  },

  /* Scroll */
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: rs(16),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: { fontSize: rs(13), fontWeight: '700' },

  /* Portal grid */
  portalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  portalCard: {
    width: '30.5%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  portalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  portalIconText: { fontSize: rs(15), fontWeight: '800' },
  portalName: { fontSize: rs(13), fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryText: { fontSize: rs(11), fontWeight: '700' },

  /* Mobile Money */
  momoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  momoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  momoName: { fontSize: rs(17), fontWeight: '700' },
  momoUssd: { fontSize: rs(14), fontFamily: 'monospace' },
  momoDesc: { fontSize: rs(14), lineHeight: 16, marginBottom: 8 },
  momoActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  momoActionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  momoActionText: { fontSize: rs(12), fontWeight: '700' },

  /* Exchange rates */
  rateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rateCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  rateFlag: { fontSize: 22 },
  rateCode: { fontSize: rs(14), fontWeight: '700' },
  rateValue: { fontSize: rs(14), fontWeight: '700' },

  /* Converter */
  converterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  converterInput: {
    width: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: rs(17),
    fontWeight: '700',
    textAlign: 'right',
  },
  converterCurrencies: { flexDirection: 'row', gap: 4 },
  converterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  converterResult: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  converterResultText: { fontSize: rs(17), fontWeight: '700' },

  /* GovPlay Games */
  comingSoonNote: { fontSize: rs(14), marginBottom: 10, fontStyle: 'italic' },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameCard: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  gameEmoji: { fontSize: 24 },
  gameName: { fontSize: rs(13), fontWeight: '700' },

  /* USSD Codes */
  ussdHint: { fontSize: rs(14), marginBottom: 10, fontStyle: 'italic' },
  ussdCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    padding: 12,
  },
  ussdAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  ussdNetworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  ussdNetworkBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ussdNetworkCode: { fontSize: rs(13), fontWeight: '800' },
  ussdNetworkName: { fontSize: rs(16), fontWeight: '700' },
  ussdCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  ussdCode: { fontSize: rs(15), fontWeight: '700', fontFamily: 'monospace', minWidth: 100 },
  ussdLabel: { fontSize: rs(14), flex: 1 },
});
