import tarfile
for name in ['expo-router-3.4.10.tgz', 'expo-router-3.5.24.tgz']:
    print('===', name)
    try:
        with tarfile.open(name, 'r:gz') as f:
            found = [m.name for m in f.getmembers() if m.name.endswith('_ctx-shared.js')]
            print(found)
    except Exception as e:
        print('ERROR', e)
