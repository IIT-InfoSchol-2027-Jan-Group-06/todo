import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  imageUri?: string | null;
};

let nextId = 1;

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const [query, setQuery] = useState('');

  const [isAdding, setIsAdding] = useState(false);


  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({ light: '#F2F3F5', dark: '#1D1F20' }, 'background');

  const remaining = todos.filter((todo) => !todo.completed).length;

  // ponytail: filter on every keystroke, no debounce/useMemo. The list is in memory.
  // Debounce when it comes from an API, or memoise past a few thousand todos.
  const q = query.trim().toLowerCase();
  const visible = todos.filter((todo) => todo.title.toLowerCase().includes(q));

  const addTodo = () => {
    const title = input.trim();
    if (!title) {
      return;
    }
    setTodos((prev) => [{ id: String(nextId++), title, completed: false }, ...prev]);
    setInput('');
  };

  const submitTodo = () => {
    addTodo();
    Keyboard.dismiss();
    setIsAdding(false);
  };

  const cancelAdding = () => {
    Keyboard.dismiss();
    setIsAdding(false);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const attachImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (uri) {
      setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, imageUri: uri } : todo)));
    }
  };

  const removeImage = (id: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === id ? { ...todo, imageUri: null } : todo)));
  };

  const addButtonColor = colorScheme === 'dark' ? colors.background : '#fff';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
          <ThemedText type="title">Todos</ThemedText>
          <ThemedText style={{ color: colors.icon }}>
            {remaining} of {todos.length} remaining
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.searchBar, { backgroundColor: surface }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search todos"
            placeholderTextColor={colors.icon}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search todos"
            style={[styles.searchField, { color: colors.text }]}
          />
        </ThemedView>

        {visible.length === 0 ? (
          <ThemedView style={styles.empty}>
            <IconSymbol name={q ? 'magnifyingglass' : 'checklist'} size={48} color={colors.icon} />
            <ThemedText style={{ color: colors.icon }}>
              {q ? `No todos match "${query.trim()}".` : 'No todos yet. Add one below.'}
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {visible.map((todo) => (
              <ThemedView key={todo.id} style={[styles.todoRow, { backgroundColor: surface }]}>
                <View style={styles.todoTopRow}>
                  <Pressable
                    onPress={() => toggleTodo(todo.id)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: todo.completed }}
                    accessibilityLabel={`${todo.completed ? 'Unmark' : 'Mark'} ${todo.title} as ${todo.completed ? 'incomplete' : 'complete'}`}>
                    <IconSymbol
                      name={todo.completed ? 'checkmark.circle.fill' : 'circle'}
                      size={26}
                      color={todo.completed ? tint : colors.icon}
                    />
                  </Pressable>
                  <ThemedText
                    style={[styles.todoTitle, todo.completed && { color: colors.icon, textDecorationLine: 'line-through' }]}
                    numberOfLines={2}>
                    {todo.title}
                  </ThemedText>
                  {todo.completed && (
                    <Pressable
                      onPress={() => attachImage(todo.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Attach an image to ${todo.title}`}>
                      <IconSymbol name="photo" size={22} color={tint} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => deleteTodo(todo.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${todo.title}`}>
                    <IconSymbol name="trash" size={22} color={colors.icon} />
                  </Pressable>
                </View>
                {todo.imageUri ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: todo.imageUri }} style={styles.todoImage} contentFit="cover" />
                    <Pressable
                      onPress={() => removeImage(todo.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove image from ${todo.title}`}
                      style={styles.removeImage}>
                      <IconSymbol name="xmark.circle.fill" size={22} color={colors.icon} />
                    </Pressable>
                  </View>
                ) : null}
              </ThemedView>
            ))}
          </ScrollView>
        )}

        {isAdding ? (
          <ThemedView style={styles.inputBar}>
            <Pressable
              onPress={cancelAdding}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Cancel adding todo"
              style={styles.cancelButton}>
              <IconSymbol name="xmark" size={22} color={colors.icon} />
            </Pressable>
            <TextInput
              autoFocus
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submitTodo}
              placeholder="Add a new todo"
              placeholderTextColor={colors.icon}
              returnKeyType="done"
              style={[styles.input, { color: colors.text, backgroundColor: surface }]}
            />
            <Pressable
              onPress={submitTodo}
              accessibilityRole="button"
              accessibilityLabel="Add todo"
              style={[styles.addButton, { backgroundColor: tint }]}>
              <IconSymbol name="checkmark" size={26} color={addButtonColor} />
            </Pressable>
          </ThemedView>
        ) : (
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a new todo"
            style={[styles.fab, { backgroundColor: tint }]}>
            <IconSymbol name="plus" size={28} color={addButtonColor} />
          </Pressable>
        )}
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  searchField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  todoRow: {
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  todoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todoTitle: {
    flex: 1,
    fontSize: 16,
  },
  imageContainer: {
    alignSelf: 'flex-start',
  },
  todoImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 11,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  cancelButton: {
    padding: 4,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
