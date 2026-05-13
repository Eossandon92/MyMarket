import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  ScrollView 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LogOut, Building, User as UserIcon, Shield } from 'lucide-react-native';
import { colors } from '../theme/colors';

export default function ProfileScreen() {
  const { user, businessName, logout, isSuperAdmin } = useAuth();

  const InfoRow = ({ label, value, icon: Icon }) => (
    <View style={styles.infoRow}>
      <Icon color={colors.textMuted} size={20} style={{ marginRight: 15 }} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Negocio</Text>
        <View style={styles.card}>
          <InfoRow label="Negocio" value={businessName} icon={Building} />
          <View style={styles.divider} />
          <InfoRow label="Email" value={user?.email} icon={UserIcon} />
          {isSuperAdmin && (
            <>
              <View style={styles.divider} />
              <InfoRow label="Permisos" value="Administrador Maestro" icon={Shield} />
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LogOut color={colors.error} size={20} style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Zoko Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  profileHeader: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.white },
  avatarContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 15
  },
  avatarText: { fontSize: 32, color: 'white', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  roleBadge: { 
    backgroundColor: colors.primary + '20', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 20,
    marginTop: 8
  },
  roleText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textMuted, marginBottom: 10, marginLeft: 5 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 12, color: colors.textMuted },
  infoValue: { fontSize: 16, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.white, 
    padding: 15, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error
  },
  logoutText: { color: colors.error, fontWeight: 'bold', fontSize: 16 },
  versionText: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginBottom: 30 }
});
