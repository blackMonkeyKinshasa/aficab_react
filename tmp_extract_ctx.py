import tarfile
with tarfile.open('expo-router-3.5.24.tgz', 'r:gz') as f:
    member = next((m for m in f.getmembers() if m.name == 'package/_ctx-shared.js'), None)
    if member:
        print(f.extractfile(member).read().decode('utf-8'))
    else:
        print('NOT FOUND')
