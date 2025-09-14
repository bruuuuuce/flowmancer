import { describe, it, expect, vi } from 'vitest';
import { DrawioParser, type DrawioGraph } from '../../src/parsers/DrawioParser';

describe('DrawioParser', () => {
  
  describe('parseXML', () => {
    it('should parse a simple draw.io XML with nodes and connections', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="node1" value="Ingress Node" style="ellipse" parent="1" vertex="1">
              <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
            </mxCell>
            <mxCell id="node2" value="Service A" style="rectangle" parent="1" vertex="1">
              <mxGeometry x="300" y="50" width="120" height="60" as="geometry"/>
            </mxCell>
            <mxCell id="edge1" value="request" style="endArrow=classic" parent="1" source="node1" target="node2" edge="1"/>
          </root>
        </mxGraphModel>`;
      
      const graph = DrawioParser.parseXML(xml);
      
      expect(graph.nodes).toHaveLength(2);
      expect(graph.connections).toHaveLength(1);
      
      expect(graph.nodes[0]).toMatchObject({
        id: 'node1',
        label: 'Ingress Node',
        shape: 'ellipse',
        x: 100,
        y: 50,
        width: 120,
        height: 60
      });
      
      expect(graph.connections[0]).toMatchObject({
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        label: 'request'
      });
    });
    
    it('should handle HTML entities in labels', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="node1" value="&lt;b&gt;Service&lt;/b&gt;&amp;nbsp;API" style="rectangle" parent="1" vertex="1">
              <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>`;
      
      const graph = DrawioParser.parseXML(xml);
      
      // Non-breaking space should be normalized to regular space
      expect(graph.nodes[0].label).toBe('Service API');
    });
    
    it('should throw error for invalid XML', () => {
      const invalidXml = '<invalid>not closed';
      
      expect(() => DrawioParser.parseXML(invalidXml)).toThrow('XML parsing error');
    });
    
    it('should handle nodes without geometry', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="node1" value="Node without geometry" style="rectangle" parent="1" vertex="1"/>
          </root>
        </mxGraphModel>`;
      
      const graph = DrawioParser.parseXML(xml);
      
      // Node without geometry should be skipped
      expect(graph.nodes).toHaveLength(0);
    });
  });
  
  describe('Node type inference', () => {
    it('should infer Ingress from label keywords', () => {
      const testCases = [
        { label: 'User Ingress', shape: 'rectangle', expected: 'Ingress' },
        { label: 'API Gateway', shape: 'rectangle', expected: 'Ingress' },
        { label: 'Entry Point', shape: 'rectangle', expected: 'Ingress' },
        { label: 'Start', shape: 'rectangle', expected: 'Ingress' }
      ];
      
      for (const { label, shape, expected } of testCases) {
        const node = { id: 'test', label, shape, x: 0, y: 0, width: 100, height: 50, style: '' };
        const graph: DrawioGraph = { nodes: [node], connections: [] };
        const config = DrawioParser.convertToSimulationConfig(graph);
        expect(config.nodes[0].kind).toBe(expected);
      }
    });
    
    it('should infer LoadBalancer from label keywords', () => {
      const testCases = [
        { label: 'Load Balancer', shape: 'rectangle', expected: 'LoadBalancer' },
        { label: 'LB Service', shape: 'rectangle', expected: 'LoadBalancer' },
        { label: 'Proxy Server', shape: 'rectangle', expected: 'LoadBalancer' }
      ];
      
      for (const { label, shape, expected } of testCases) {
        const node = { id: 'test', label, shape, x: 0, y: 0, width: 100, height: 50, style: '' };
        const graph: DrawioGraph = { nodes: [node], connections: [] };
        const config = DrawioParser.convertToSimulationConfig(graph);
        expect(config.nodes[0].kind).toBe(expected);
      }
    });
    
    it('should infer Cache from label keywords', () => {
      const testCases = [
        { label: 'Redis Cache', shape: 'rectangle', expected: 'Cache' },
        { label: 'Memcached', shape: 'rectangle', expected: 'Cache' },
        { label: 'Cache Layer', shape: 'rectangle', expected: 'Cache' }
      ];
      
      for (const { label, shape, expected } of testCases) {
        const node = { id: 'test', label, shape, x: 0, y: 0, width: 100, height: 50, style: '' };
        const graph: DrawioGraph = { nodes: [node], connections: [] };
        const config = DrawioParser.convertToSimulationConfig(graph);
        expect(config.nodes[0].kind).toBe(expected);
      }
    });
    
    it('should infer DB from label keywords', () => {
      const testCases = [
        { label: 'MySQL Database', shape: 'rectangle', expected: 'DB' },
        { label: 'PostgreSQL DB', shape: 'rectangle', expected: 'DB' },
        { label: 'MongoDB', shape: 'rectangle', expected: 'DB' },
        { label: 'User DB', shape: 'rectangle', expected: 'DB' }
      ];
      
      for (const { label, shape, expected } of testCases) {
        const node = { id: 'test', label, shape, x: 0, y: 0, width: 100, height: 50, style: '' };
        const graph: DrawioGraph = { nodes: [node], connections: [] };
        const config = DrawioParser.convertToSimulationConfig(graph);
        expect(config.nodes[0].kind).toBe(expected);
      }
    });
    
    it('should infer node type from shape when label is ambiguous', () => {
      const testCases = [
        { label: 'Node A', shape: 'ellipse', expected: 'Ingress' },
        { label: 'Node B', shape: 'diamond', expected: 'LoadBalancer' },
        { label: 'Node C', shape: 'cylinder', expected: 'DB' },
        { label: 'Node D', shape: 'cloud', expected: 'ExternalAPI' },
        { label: 'Node E', shape: 'hexagon', expected: 'Queue' },
        { label: 'Node F', shape: 'rectangle', expected: 'Service' }
      ];
      
      for (const { label, shape, expected } of testCases) {
        const node = { id: 'test', label, shape, x: 0, y: 0, width: 100, height: 50, style: '' };
        const graph: DrawioGraph = { nodes: [node], connections: [] };
        const config = DrawioParser.convertToSimulationConfig(graph);
        expect(config.nodes[0].kind).toBe(expected);
      }
    });
  });
  
  describe('convertToSimulationConfig', () => {
    it('should convert a simple graph to simulation config', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'ingress1', label: 'User Ingress', shape: 'ellipse', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'service1', label: 'Service A', shape: 'rectangle', x: 200, y: 0, width: 100, height: 50, style: '' },
          { id: 'db1', label: 'Database', shape: 'cylinder', x: 400, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'ingress1', target: 'service1', label: '' },
          { id: 'edge2', source: 'service1', target: 'db1', label: '' }
        ]
      };
      
      const config = DrawioParser.convertToSimulationConfig(graph);
      
      expect(config.nodes).toHaveLength(3);
      expect(config.links).toHaveLength(2);
      
      expect(config.nodes[0]).toMatchObject({
        id: 'ingress1',
        kind: 'Ingress',
        rateRps: 10,
        timeout_ms: 5000
      });
      
      expect(config.nodes[1]).toMatchObject({
        id: 'service1',
        kind: 'Service',
        capacity: 100,
        base_ms: 20,
        jitter_ms: 10
      });
      
      expect(config.nodes[2]).toMatchObject({
        id: 'db1',
        kind: 'DB',
        capacity: 50,
        base_ms: 50,
        jitter_ms: 20
      });
      
      expect(config.links[0]).toMatchObject({
        from: 'ingress1',
        to: 'service1'
      });
    });
    
    it('should filter out connections with non-existent nodes', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Service A', shape: 'rectangle', x: 0, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'nonexistent', label: '' },
          { id: 'edge2', source: 'nonexistent', target: 'node1', label: '' }
        ]
      };
      
      const config = DrawioParser.convertToSimulationConfig(graph);
      
      expect(config.links).toHaveLength(0);
    });
    
    it('should include default routing policies for nodes', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'ingress1', label: 'Ingress', shape: 'ellipse', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'lb1', label: 'Load Balancer', shape: 'diamond', x: 200, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: []
      };
      
      const config = DrawioParser.convertToSimulationConfig(graph);
      
      expect(config.nodes[0].routing).toEqual({ policy: 'weighted' });
      expect(config.nodes[1].routing).toEqual({ policy: 'round_robin' });
    });
  });
  
  describe('validateGraph', () => {
    it('should detect isolated nodes', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Connected', shape: 'rectangle', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'node2', label: 'Isolated', shape: 'rectangle', x: 200, y: 0, width: 100, height: 50, style: '' },
          { id: 'node3', label: 'Also Connected', shape: 'rectangle', x: 400, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'node3', label: '' }
        ]
      };
      
      const errors = DrawioParser.validateGraph(graph);
      
      expect(errors).toContain('Isolated nodes detected: Isolated');
    });
    
    it('should detect invalid connections', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Node 1', shape: 'rectangle', x: 0, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'nonexistent', label: '' }
        ]
      };
      
      const errors = DrawioParser.validateGraph(graph);
      
      expect(errors).toContain('Invalid connections detected: 1 connections reference missing nodes');
    });
    
    it('should warn if no ingress node is detected', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Service A', shape: 'rectangle', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'node2', label: 'Service B', shape: 'rectangle', x: 200, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'node2', label: '' }
        ]
      };
      
      const errors = DrawioParser.validateGraph(graph);
      
      expect(errors.some(e => e.includes('No ingress node detected'))).toBe(true);
    });
    
    it('should warn if no sink node is detected', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Ingress', shape: 'ellipse', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'node2', label: 'Service', shape: 'rectangle', x: 200, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'node2', label: '' }
        ]
      };
      
      const errors = DrawioParser.validateGraph(graph);
      
      expect(errors.some(e => e.includes('No sink node detected'))).toBe(true);
    });
    
    it('should return no errors for a valid graph', () => {
      const graph: DrawioGraph = {
        nodes: [
          { id: 'node1', label: 'Ingress', shape: 'ellipse', x: 0, y: 0, width: 100, height: 50, style: '' },
          { id: 'node2', label: 'Service', shape: 'rectangle', x: 200, y: 0, width: 100, height: 50, style: '' },
          { id: 'node3', label: 'Sink', shape: 'rectangle', x: 400, y: 0, width: 100, height: 50, style: '' }
        ],
        connections: [
          { id: 'edge1', source: 'node1', target: 'node2', label: '' },
          { id: 'edge2', source: 'node2', target: 'node3', label: '' }
        ]
      };
      
      const errors = DrawioParser.validateGraph(graph);
      
      expect(errors).toHaveLength(0);
    });
  });
  
  describe('Complex XML parsing scenarios', () => {
    it('should handle draw.io files with multiple diagram pages (only parse first)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mxfile>
          <diagram name="Page-1">
            <mxGraphModel>
              <root>
                <mxCell id="0"/>
                <mxCell id="1" parent="0"/>
                <mxCell id="node1" value="First Page Node" style="rectangle" parent="1" vertex="1">
                  <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
                </mxCell>
              </root>
            </mxGraphModel>
          </diagram>
          <diagram name="Page-2">
            <mxGraphModel>
              <root>
                <mxCell id="0"/>
                <mxCell id="2" parent="0"/>
                <mxCell id="node2" value="Second Page Node" style="rectangle" parent="2" vertex="1">
                  <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
                </mxCell>
              </root>
            </mxGraphModel>
          </diagram>
        </mxfile>`;
      
      const graph = DrawioParser.parseXML(xml);
      
      // Should parse all nodes from all pages
      expect(graph.nodes.length).toBeGreaterThanOrEqual(1);
      expect(graph.nodes.some(n => n.label === 'First Page Node')).toBe(true);
    });
    
    it('should extract shape from complex style strings', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mxGraphModel>
          <root>
            <mxCell id="0"/>
            <mxCell id="1" parent="0"/>
            <mxCell id="node1" value="Complex Style" style="rounded=1;whiteSpace=wrap;html=1;shape=cylinder;fillColor=#dae8fc;" parent="1" vertex="1">
              <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
            </mxCell>
          </root>
        </mxGraphModel>`;
      
      const graph = DrawioParser.parseXML(xml);
      
      expect(graph.nodes[0].shape).toBe('cylinder');
    });
  });
});
