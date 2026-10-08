import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ManageEventsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color="#333"
          />
        </Pressable>

        <Text style={styles.title}>
          Manage Events
        </Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="calendar-outline"
              size={45}
              color="#555"
            />
          </View>

          <Text style={styles.heading}>
            Event Management
          </Text>

          <Text style={styles.description}>
            Create and manage school attendance events.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              // Event creation can be connected here
              alert('Create Event feature');
            }}
          >
            <Ionicons
              name="add"
              size={21}
              color="#fff"
            />

            <Text style={styles.createButtonText}>
              Create Event
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EA',
  },

  header: {
    height: 65,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#E7E2D5',
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },

  content: {
    padding: 16,
  },

  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3DED2',
    padding: 30,
    alignItems: 'center',
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDEAE0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heading: {
    fontSize: 21,
    fontWeight: '700',
    color: '#333',
    marginTop: 18,
  },

  description: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    color: '#777',
    marginTop: 8,
  },

  createButton: {
    marginTop: 22,
    backgroundColor: '#555',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  pressed: {
    opacity: 0.6,
  },

  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});