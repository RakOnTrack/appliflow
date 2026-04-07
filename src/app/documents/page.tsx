export default function DocumentsPage() {
  const documents = [
    { id: 1, name: 'Resume_v1.docx' },
    { id: 2, name: 'CoverLetter_v1.docx' },
  ];

  return (
    <div className="p-5">
      <h2 className="text-2xl font-semibold mb-4">Documents</h2>
      <ul className="space-y-2">
        {documents.map(doc => (
          <li key={doc.id} className="p-3 border rounded">{doc.name}</li>
        ))}
      </ul>
    </div>
  );
}
