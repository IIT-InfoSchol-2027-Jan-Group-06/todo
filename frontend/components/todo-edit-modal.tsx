import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Props = {
  visible: boolean;
  mode: 'create' | 'edit';
  title: string;
  deadline: number | null;
  onCancel: () => void;
  onSave: (title: string, deadline: number | null) => void;
};

const formatDeadline = (deadline: Date) =>
  deadline.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export function TodoEditModal({ visible, mode, title: initialTitle, deadline: initialDeadline, onCancel, onSave }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({ light: '#F2F3F5', dark: '#1D1F20' }, 'background');
  const danger = colorScheme === 'dark' ? '#FF6B6B' : '#D0342C';

  const [title, setTitle] = useState(initialTitle);
  const [deadline, setDeadline] = useState<Date | null>(initialDeadline ? new Date(initialDeadline) : null);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDeadline(initialDeadline ? new Date(initialDeadline) : null);
      setPicker(null);
    }
  }, [visible, initialTitle, initialDeadline]);

  const mergeDate = (base: Date | null, pick: Date): Date => {
    const d = base ? new Date(base) : new Date();
    d.setFullYear(pick.getFullYear(), pick.getMonth(), pick.getDate());
    d.setSeconds(0, 0);
    return d;
  };

  const mergeTime = (base: Date | null, pick: Date): Date => {
    const d = base ? new Date(base) : new Date();
    d.setHours(pick.getHours(), pick.getMinutes(), 0, 0);
    return d;
  };

  const onChangePicker = (pickerMode: 'date' | 'time') => (event: DateTimePickerEvent, pick?: Date) => {
    if (Platform.OS === 'android') {
      setPicker(null);
    }
    if (event.type !== 'dismissed' && pick) {
      setDeadline((prev) => (pickerMode === 'date' ? mergeDate(prev, pick) : mergeTime(prev, pick)));
    }
  };

  const save = () => {
    onSave(title.trim() || initialTitle, deadline ? deadline.getTime() : null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ThemedView style={styles.sheet}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">{mode === 'create' ? 'New Todo' : 'Edit Todo'}</ThemedText>
              <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close editor">
                <IconSymbol name="xmark" size={22} color={colors.icon} />
              </Pressable>
            </ThemedView>

            <ThemedText style={styles.label}>Title</ThemedText>
            <TextInput
              autoFocus
              value={title}
              onChangeText={setTitle}
              placeholder="Todo title"
              placeholderTextColor={colors.icon}
              returnKeyType="done"
              style={[styles.input, { color: colors.text, backgroundColor: surface }]}
            />

            <ThemedText style={styles.label}>Deadline</ThemedText>
            <ThemedView style={[styles.deadlineRow, { backgroundColor: surface }]}>
              <Pressable
                onPress={() => setPicker((p) => (p === 'date' ? null : 'date'))}
                accessibilityRole="button"
                accessibilityLabel="Set date"
                style={[styles.pickerButton, { backgroundColor: tint }]}>
                <ThemedText style={[styles.pickerButtonText, { color: colors.background }]}>Date</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setPicker((p) => (p === 'time' ? null : 'time'))}
                accessibilityRole="button"
                accessibilityLabel="Set time"
                style={[styles.pickerButton, { backgroundColor: tint }]}>
                <ThemedText style={[styles.pickerButtonText, { color: colors.background }]}>Time</ThemedText>
              </Pressable>
              {deadline && (
                <Pressable
                  onPress={() => setDeadline(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear deadline">
                  <ThemedText style={{ color: danger }}>Clear</ThemedText>
                </Pressable>
              )}
            </ThemedView>
            <ThemedText style={[styles.deadlinePreview, { color: deadline ? colors.text : colors.icon }]}>
              {deadline ? formatDeadline(deadline) : 'No deadline set'}
            </ThemedText>

            {picker === 'date' && (
              <DateTimePicker
                value={deadline ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onChangePicker('date')}
              />
            )}
            {picker === 'time' && (
              <DateTimePicker
                value={deadline ?? new Date()}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangePicker('time')}
              />
            )}
            {Platform.OS === 'ios' && picker && (
              <Pressable onPress={() => setPicker(null)} accessibilityRole="button" accessibilityLabel="Done picking">
                <ThemedText style={{ color: tint, textAlign: 'center', paddingVertical: 8 }}>Done</ThemedText>
              </Pressable>
            )}

            <ThemedView style={styles.actions}>
              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={[styles.actionButton, { backgroundColor: surface }]}>
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={save}
                accessibilityRole="button"
                accessibilityLabel={mode === 'create' ? 'Add todo' : 'Save todo'}
                style={[styles.actionButton, { backgroundColor: tint }]}>
                <ThemedText style={{ color: colors.background, fontWeight: '600' }}>
                  {mode === 'create' ? 'Add' : 'Save'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pickerButtonText: {
    fontWeight: '600',
  },
  deadlinePreview: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
});
