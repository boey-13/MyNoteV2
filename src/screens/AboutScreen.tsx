// src/screens/AboutScreen.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Linking, Image } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';

export default function AboutScreen({ navigation }: any) {
  const { theme } = useAppTheme();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.appTitle}>MyNote</Text>
          <Text style={styles.appVersion}>Version 2.0.0</Text>
          <Text style={styles.appDescription}>
            A modern note-taking app with rich text editing, folder organization, and cloud sync capabilities.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="edit-3" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Rich text editing with formatting</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="folder" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Folder organization system</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="star" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Favorites and quick access</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="search" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Advanced search functionality</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="cloud" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Cloud sync and backup</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="image" size={24} color="#455B96" style={styles.featureIcon} />
              <Text style={styles.featureText}>Image attachments support</Text>
            </View>
          </View>
        </View>

        {/* Technology Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built With</Text>
          <View style={styles.techList}>
            <View style={styles.techItem}>
              <Text style={styles.techName}>React Native</Text>
              <Text style={styles.techDescription}>Cross-platform mobile development</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>TypeScript</Text>
              <Text style={styles.techDescription}>Type-safe JavaScript</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>SQLite</Text>
              <Text style={styles.techDescription}>Local database storage</Text>
            </View>
            <View style={styles.techItem}>
              <Text style={styles.techName}>React Navigation</Text>
              <Text style={styles.techDescription}>Navigation and routing</Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Support</Text>
          <View style={styles.contactList}>
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => openLink('mailto:support@mynotev2.com')}
            >
              <Icon name="mail" size={24} color="#333" style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email Support</Text>
                <Text style={styles.contactSubtitle}>support@mynotev2.com</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => openLink('https://github.com/mynotev2')}
            >
              <Icon name="github" size={24} color="#333" style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>GitHub</Text>
                <Text style={styles.contactSubtitle}>View source code</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactItem}
              onPress={() => openLink('https://mynotev2.com')}
            >
              <Icon name="globe" size={24} color="#333" style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Website</Text>
                <Text style={styles.contactSubtitle}>mynotev2.com</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.legalList}>
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalText}>Open Source Licenses</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 MyNote V2. All rights reserved.
          </Text>
          <View style={styles.footerSubtextContainer}>
            <Text style={styles.footerSubtext}>
              Made with 
            </Text>
            <Icon name="heart" size={16} color="#E74C3C" />
            <Text style={styles.footerSubtext}>
              {' '}for note-taking enthusiasts
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  appVersion: {
    fontSize: 16,
    color: '#455B96',
    marginBottom: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  appDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Poppins-Bold',
  },
  featureList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
    width: 30,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  techList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  techItem: {
    marginBottom: 12,
  },
  techName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#455B96',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  techDescription: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  contactList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  contactIcon: {
    marginRight: 12,
    width: 30,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    fontFamily: 'Poppins-Bold',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  legalList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
  },
  legalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  legalText: {
    fontSize: 16,
    color: '#455B96',
    fontFamily: 'Poppins-SemiBold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
    fontFamily: 'Poppins-Regular',
  },
  footerSubtextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#CCC',
    fontFamily: 'Poppins-Regular',
  },
});
